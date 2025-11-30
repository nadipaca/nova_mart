package com.novamart.catalog.repository;

import com.novamart.catalog.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data JPA repository for Product entities.
 */
public interface ProductRepository extends JpaRepository<Product, Long> {

    boolean existsBySku(String sku);
}

