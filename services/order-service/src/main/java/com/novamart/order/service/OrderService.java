package com.novamart.order.service;

import java.math.BigDecimal;
import java.util.List;

import com.novamart.order.domain.Order;
import com.novamart.order.domain.OrderItem;
import com.novamart.order.dto.CreateOrderItemRequest;
import com.novamart.order.dto.CreateOrderRequest;
import com.novamart.order.events.OrderPlacedEventPublisher;
import com.novamart.order.inventory.InventoryClient;
import com.novamart.order.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/**
 * Application service for creating and fetching orders.
 */
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderPlacedEventPublisher eventPublisher;
    private final InventoryClient inventoryClient;

    public OrderService(
        OrderRepository orderRepository,
        OrderPlacedEventPublisher eventPublisher,
        InventoryClient inventoryClient
    ) {
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
        this.inventoryClient = inventoryClient;
    }

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        inventoryClient.assertSufficientStock(request.getItems());

        Order order = new Order();
        order.setCustomerId(request.getCustomerId());

        BigDecimal total = BigDecimal.ZERO;
        for (CreateOrderItemRequest itemReq : request.getItems()) {
            OrderItem item = new OrderItem();
            item.setProductId(itemReq.getProductId());
            item.setProductSku(itemReq.getProductSku());
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(itemReq.getUnitPrice());

            order.addItem(item);

            BigDecimal lineTotal = itemReq.getUnitPrice()
                .multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            total = total.add(lineTotal);
        }
        order.setTotalAmount(total);

        Order saved = orderRepository.save(order);

        eventPublisher.publishOrderPlaced(saved);

        return saved;
    }

    @Transactional(readOnly = true)
    public Order getOrder(Long id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    @Transactional(readOnly = true)
    public List<Order> getOrdersForCustomer(String customerId) {
        return orderRepository.findByCustomerId(customerId);
    }

    @Transactional(readOnly = true)
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }
}
