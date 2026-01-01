package com.novamart.catalog.web.dto;

import java.math.BigDecimal;

/**
 * Lightweight DTO for list views of products.
 */
public record ProductSummaryDto(Long id, String name, BigDecimal price) {
}
