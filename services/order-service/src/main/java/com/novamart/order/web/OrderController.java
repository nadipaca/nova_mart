package com.novamart.order.web;

import java.util.List;

import com.novamart.order.domain.Order;
import com.novamart.order.dto.CreateOrderRequest;
import com.novamart.order.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller exposing endpoints to create and fetch orders.
 */
@RestController
@RequestMapping("/orders")
@CrossOrigin(origins = "http://localhost:3000")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    /**
     * Creates a new order and emits an order.placed event.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Order createOrder(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.createOrder(request);
    }

    /**
     * Returns a single order by id.
     */
    @GetMapping("/{id}")
    public Order getOrder(@PathVariable Long id) {
        return orderService.getOrder(id);
    }

    /**
     * Returns orders for a given customer, if customerId is provided.
     * If not, returns all orders (dev convenience).
     */
    @GetMapping
    public List<Order> getOrders(@RequestParam(required = false) String customerId) {
        if (customerId != null && !customerId.isBlank()) {
            return orderService.getOrdersForCustomer(customerId);
        }
        return orderService.getAllOrders();
    }
}
