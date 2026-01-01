package com.novamart.catalog.web;

import com.novamart.catalog.domain.Product;
import com.novamart.catalog.repository.ProductRepository;
import com.novamart.catalog.web.dto.ProductDetailDto;
import com.novamart.catalog.web.dto.ProductSummaryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST controller exposing read-only endpoints for products.
 */
@RestController
@RequestMapping("/products")
@CrossOrigin(origins = "http://localhost:3000")
public class ProductController {

    private final ProductRepository productRepository;
    private static final int MAX_PAGE_SIZE = 50;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    /**
     * Returns all products.
     */
    @GetMapping
    public Page<ProductSummaryDto> getAllProducts(@PageableDefault(size = 20) Pageable pageable) {
        Pageable effectivePageable = clampPageSize(pageable);
        return productRepository.findAll(effectivePageable)
            .map(ProductController::toSummaryDto);
    }

    /**
     * Returns a single product by its id.
     */
    @GetMapping("/{id}")
    public ProductDetailDto getProductById(@PathVariable Long id) {
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        return toDetailDto(product);
    }

    private static ProductSummaryDto toSummaryDto(Product product) {
        return new ProductSummaryDto(product.getId(), product.getName(), product.getPrice());
    }

    private static ProductDetailDto toDetailDto(Product product) {
        return new ProductDetailDto(
            product.getId(),
            product.getName(),
            product.getPrice(),
            product.getDescription(),
            product.getImageUrl()
        );
    }

    private static Pageable clampPageSize(Pageable pageable) {
        int size = Math.min(pageable.getPageSize(), MAX_PAGE_SIZE);
        if (size == pageable.getPageSize()) {
            return pageable;
        }
        return PageRequest.of(pageable.getPageNumber(), size, pageable.getSort());
    }
}
