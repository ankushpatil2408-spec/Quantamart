package com.ecommerce.repository;

import com.ecommerce.model.ProductOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for Order entity operations.
 * Path: src/main/java/com/ecommerce/repository/OrderRepository.java
 */
@Repository
public interface OrderRepository extends JpaRepository<ProductOrder, Long> {
}
