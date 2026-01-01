package com.novamart.catalog.web.dto;

import java.math.BigDecimal;

/**
 * Detailed DTO for single-product responses.
 */
public record ProductDetailDto(
    Long id,
    String name,
    BigDecimal price,
    String description,
    String imageUrl
) {
}
