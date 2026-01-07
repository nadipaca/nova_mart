package com.novamart.catalog.web;

import java.io.IOException;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;

@Component
public class InstanceHeaderFilter implements Filter {

    private final String instance = System.getenv().getOrDefault("HOSTNAME", "unknown");

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
        throws IOException, ServletException {
        if (response instanceof HttpServletResponse http) {
            http.setHeader("X-Instance", instance);
        }
        chain.doFilter(request, response);
    }
}

