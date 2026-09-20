package com.middleware.gateway.services;

import com.middleware.gateway.dto.ParsedDocumentDTO;
import com.middleware.gateway.exceptions.FileParsingException;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.metadata.TikaCoreProperties;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class DocumentParserService {

    /**
     * Extracts text and metadata from enterprise multi-modal documents (PDF, DOCX, TXT).
     * Uses BodyContentHandler(-1) to bypass Tika's default 100,000 character extraction cap.
     */
    public ParsedDocumentDTO parse(InputStream inputStream, String fileName) {
        log.info("Beginning multi-modal document extraction for file [{}]", fileName);
        long startTime = System.currentTimeMillis();

        try {
            // CRITICAL: -1 overrides the 100,000 character WriteLimitReachedException cap for enterprise PDFs
            BodyContentHandler handler = new BodyContentHandler(-1);
            Metadata metadata = new Metadata();
            ParseContext parseContext = new ParseContext();
            AutoDetectParser parser = new AutoDetectParser();

            if (fileName != null) {
                metadata.set(TikaCoreProperties.RESOURCE_NAME_KEY, fileName);
            }

            parser.parse(inputStream, handler, metadata, parseContext);

            String rawText = handler.toString().trim();
            String mimeType = metadata.get(Metadata.CONTENT_TYPE);
            if (mimeType == null) {
                mimeType = "application/octet-stream";
            }

            Map<String, String> metadataMap = new HashMap<>();
            for (String name : metadata.names()) {
                metadataMap.put(name, metadata.get(name));
            }

            int charCount = rawText.length();
            long elapsedTime = System.currentTimeMillis() - startTime;

            log.info("Document [{}] parsed successfully in {}ms. Extracted {} characters. Detected MIME: [{}]",
                    fileName, elapsedTime, charCount, mimeType);

            return ParsedDocumentDTO.builder()
                    .fileName(fileName)
                    .rawText(rawText)
                    .mimeType(mimeType)
                    .characterCount(charCount)
                    .metadata(metadataMap)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse document [{}] via Apache Tika: {}", fileName, e.getMessage(), e);
            throw new FileParsingException("Failed to extract text from document [" + fileName + "]: " + e.getMessage(), e);
        }
    }
}
