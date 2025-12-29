package com.novamart.order.events;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novamart.order.domain.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.EventBridgeClientBuilder;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequest;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequestEntry;

import java.net.URI;

/**
 * Publishes order.placed events to AWS EventBridge.
 */
@Component
public class OrderPlacedEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(OrderPlacedEventPublisher.class);

    private final EventBridgeClient eventBridgeClient;
    private final ObjectMapper objectMapper;
    private final String busName;
    private final String source;

    public OrderPlacedEventPublisher(
        @Value("${aws.region}") String awsRegion,
        @Value("${aws.eventbridge-endpoint:}") String eventBridgeEndpoint,
        @Value("${novamart.events.bus-name}") String busName,
        @Value("${novamart.events.source}") String source
    ) {
        EventBridgeClientBuilder builder = EventBridgeClient.builder()
            .region(Region.of(awsRegion));
        if (eventBridgeEndpoint != null && !eventBridgeEndpoint.isBlank()) {
            builder.endpointOverride(URI.create(eventBridgeEndpoint));
        }
        this.eventBridgeClient = builder.build();
        this.objectMapper = new ObjectMapper();
        this.busName = busName;
        this.source = source;
    }

    public void publishOrderPlaced(Order order) {
        try {
            String detailJson = objectMapper.writeValueAsString(new OrderPlacedPayload(order));

            PutEventsRequestEntry entry = PutEventsRequestEntry.builder()
                .eventBusName(busName)
                .source(source)
                .detailType("order.placed")
                .detail(detailJson)
                .build();

            eventBridgeClient.putEvents(
                PutEventsRequest.builder().entries(entry).build()
            );

            log.info("Published order.placed event for order id={}", order.getId());
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize order.placed event payload for order id={}", order.getId(), e);
        } catch (Exception e) {
            log.error("Failed to publish order.placed event for order id={}", order.getId(), e);
        }
    }
}

