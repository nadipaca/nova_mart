package com.novamart.catalog.diagnostics;

import java.sql.Connection;
import java.sql.DatabaseMetaData;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseDiagnostics {

    private static final Logger log = LoggerFactory.getLogger(DatabaseDiagnostics.class);

    @Bean
    ApplicationRunner logDatabaseConnection(DataSource dataSource, JdbcTemplate jdbcTemplate) {
        return args -> {
            try (Connection connection = dataSource.getConnection()) {
                DatabaseMetaData metaData = connection.getMetaData();
                log.info("Catalog DB JDBC URL: {}", metaData.getURL());
                log.info("Catalog DB user: {}", metaData.getUserName());
            }

            try {
                Long count = jdbcTemplate.queryForObject("select count(*) from products", Long.class);
                String db = jdbcTemplate.queryForObject("select current_database()", String.class);
                log.info("Catalog DB current_database(): {}", db);
                log.info("Catalog DB products count: {}", count);
            } catch (Exception e) {
                log.warn("Catalog DB probe failed: {}", e.getMessage());
            }
        };
    }
}

