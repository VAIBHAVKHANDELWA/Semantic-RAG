import hashlib
import logging
import os
import re
import redis

logger = logging.getLogger("python-ai-engine.conflict")

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))


class ConflictAdjudicationService:
    """
    Deterministic NLI Cross-Encoder and Rule-Based Conflict Adjudication Service.
    Replaces random mocks with reproducible classification and 30-day Redis adjudication caching.
    Fixes SUPERSIDING_POLICY spelling typo to canonical SUPERSEDING_POLICY.
    """

    def __init__(self):
        self._model = None
        self.adjudicator_mode = os.environ.get("ADJUDICATOR", "heuristic")  # heuristic | ollama
        self._init_redis()

    def _init_redis(self):
        try:
            self.redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=0,
                decode_responses=True,
                socket_connect_timeout=2
            )
            self.redis_client.ping()
        except Exception as e:
            logger.warning(f"Adjudication Redis cache offline ({e}); proceeding with direct evaluation.")
            self.redis_client = None

    def _get_model(self):
        if self._model is None:
            try:
                from sentence_transformers import CrossEncoder
                # Free, local, fast (~80MB) cross-encoder for NLI entailment/contradiction scoring
                self._model = CrossEncoder("cross-encoder/nli-deberta-v3-xsmall")
                logger.info("Loaded CrossEncoder model: cross-encoder/nli-deberta-v3-xsmall")
            except Exception as e:
                logger.warning(f"Could not load DeBERTa CrossEncoder ({e}); falling back to deterministic rule adjudicator")
                self._model = False
        return self._model

    def adjudicate_conflict(self, incoming_text: str, existing_text: str, tenant_id: str = "HR") -> dict:
        """
        Adjudicates semantic conflict between incoming and existing text.
        Caches verdict in Redis key 'adj:{tenant}:{sha256(a)}:{sha256(b)}' for 30 days.
        """
        sha_inc = hashlib.sha256(incoming_text.encode('utf-8')).hexdigest()
        sha_ex = hashlib.sha256(existing_text.encode('utf-8')).hexdigest()
        cache_key = f"adj:{tenant_id}:{sha_ex}:{sha_inc}"

        if self.redis_client:
            try:
                cached = self.redis_client.get(cache_key)
                if cached:
                    import json
                    self.redis_client.incr("metrics:cache_hits:adjudication")
                    logger.debug(f"Adjudication Cache HIT for key [{cache_key}]")
                    return json.loads(cached)
            except Exception:
                pass

        if self.adjudicator_mode == "ollama":
            verdict = self._adjudicate_ollama(incoming_text, existing_text)
        else:
            verdict = self._adjudicate_heuristic(incoming_text, existing_text)

        if self.redis_client:
            try:
                import json
                self.redis_client.setex(cache_key, 30 * 86400, json.dumps(verdict))
            except Exception:
                pass

        return verdict

    def _extract_rule_features(self, incoming: str, existing: str) -> dict:
        inc_lower = incoming.lower()
        ex_lower = existing.lower()

        # 1. Year comparison
        years_in = [int(y) for y in re.findall(r'\b(20\d{2})\b', incoming)]
        years_ex = [int(y) for y in re.findall(r'\b(20\d{2})\b', existing)]
        max_in_year = max(years_in) if years_in else None
        max_ex_year = max(years_ex) if years_ex else None
        has_newer_year = bool(max_in_year and max_ex_year and max_in_year > max_ex_year)

        # 2. Explicit Supersession Phrases
        supersedes_phrases = [
            "supersedes", "replaces", "effective from", "effective date",
            "amends", "this policy replaces", "updated policy", "prior policy is void",
            "superseding"
        ]
        has_supersedes_phrase = any(phrase in inc_lower for phrase in supersedes_phrases)

        # 3. Negation & Removal Keywords
        negation_words = [
            "no longer", "not permitted", "prohibited", "revoked", "cancelled",
            "disallowed", "strictly forbidden", "voided", "shall not"
        ]
        has_negation = any(word in inc_lower for word in negation_words)

        # 4. Token Overlap Jaccard ratio
        tok_in = set(re.findall(r'\w+', inc_lower))
        tok_ex = set(re.findall(r'\w+', ex_lower))
        intersection = len(tok_in & tok_ex)
        union = len(tok_in | tok_ex)
        overlap_ratio = (intersection / union) if union > 0 else 0.0

        return {
            "has_newer_year": has_newer_year,
            "max_in_year": max_in_year,
            "max_ex_year": max_ex_year,
            "has_supersedes_phrase": has_supersedes_phrase,
            "has_negation": has_negation,
            "overlap_ratio": round(overlap_ratio, 3)
        }

    def _adjudicate_heuristic(self, incoming_text: str, existing_text: str) -> dict:
        features = self._extract_rule_features(incoming_text, existing_text)
        model = self._get_model()

        contradiction_score = 0.5
        entailment_score = 0.2
        neutral_score = 0.3

        if model:
            try:
                scores = model.predict([[existing_text, incoming_text]])[0]
                # Label mapping for cross-encoder/nli-deberta-v3-xsmall: [contradiction, entailment, neutral]
                contradiction_score = float(scores[0])
                entailment_score = float(scores[1])
                neutral_score = float(scores[2])
            except Exception as e:
                logger.debug(f"CrossEncoder inference fallback: {e}")

        # Deterministic Multi-Feature Logic Fork
        if features["has_supersedes_phrase"] or (features["has_newer_year"] and features["overlap_ratio"] > 0.2):
            verdict = "SUPERSEDING_POLICY"
            confidence = round(min(0.98, 0.70 + (0.2 if features["has_supersedes_phrase"] else 0.1) + (0.08 if features["has_newer_year"] else 0)), 3)
            year_detail = f" (Effective {features['max_in_year']} replaces legacy {features['max_ex_year']} baseline)" if features['has_newer_year'] else ""
            explanation = f"Incoming policy supersedes previous baseline terms{year_detail}. Contains explicit amendment provisions with {features['overlap_ratio']*100:.0f}% context overlap."

        elif features["has_negation"] or contradiction_score > 0.55:
            verdict = "CONTRADICTORY"
            confidence = round(min(0.99, max(0.80, contradiction_score if model else 0.88)), 3)
            explanation = f"Direct semantic contradiction detected against active baseline. Prohibitive language or restrictive clause changes identified (overlap: {features['overlap_ratio']*100:.0f}%)."

        elif features["overlap_ratio"] > 0.35 or neutral_score > 0.45:
            verdict = "PARTIAL_UPDATE"
            confidence = round(min(0.95, 0.65 + features["overlap_ratio"] * 0.3), 3)
            explanation = f"Partial semantic overlap detected ({features['overlap_ratio']*100:.0f}% shared vocabulary). Complementary provisions require human compliance steward review."

        else:
            verdict = "CLEAN_APPEND"
            confidence = round(0.90, 3)
            explanation = "No substantial semantic collision detected. Safe to commit as an independent policy chunk."

        return {
            "conflict": verdict != "CLEAN_APPEND",
            "verdict_type": verdict,
            "confidence": confidence,
            "explanation": explanation,
            "rule_features": features
        }

    def _adjudicate_ollama(self, incoming_text: str, existing_text: str) -> dict:
        """Optional Ollama Llama-3 Adjudication (when ADJUDICATOR=ollama)."""
        try:
            import requests
            prompt = (
                f"You are a regulatory compliance adjudicator. Classify the conflict relationship between these two corporate policy chunks.\n\n"
                f"BASELINE POLICY CHUNK:\n{existing_text[:600]}\n\n"
                f"INCOMING POLICY CHUNK:\n{incoming_text[:600]}\n\n"
                f"Select EXACTLY ONE verdict from: CONTRADICTORY, SUPERSEDING_POLICY, PARTIAL_UPDATE, CLEAN_APPEND.\n"
                f"Provide one sentence explaining your choice."
            )
            r = requests.post("http://localhost:11434/api/generate", json={
                "model": "llama3",
                "prompt": prompt,
                "stream": False
            }, timeout=20)
            if r.status_code == 200:
                resp = r.json().get("response", "")
                for candidate in ["SUPERSEDING_POLICY", "CONTRADICTORY", "PARTIAL_UPDATE", "CLEAN_APPEND"]:
                    if candidate in resp:
                        return {
                            "conflict": candidate != "CLEAN_APPEND",
                            "verdict_type": candidate,
                            "confidence": 0.85,
                            "explanation": resp.strip()
                        }
        except Exception as e:
            logger.warning(f"Ollama adjudication error ({e}), falling back to deterministic heuristic.")

        return self._adjudicate_heuristic(incoming_text, existing_text)


conflict_service = ConflictAdjudicationService()
