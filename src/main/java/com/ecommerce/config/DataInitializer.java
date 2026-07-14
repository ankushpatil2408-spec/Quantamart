package com.ecommerce.config;

import com.ecommerce.model.Product;
import com.ecommerce.model.User;
import com.ecommerce.model.Role;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * CommandLineRunner to seed the database with mock products and users.
 * Path: src/main/java/com/ecommerce/config/DataInitializer.java
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DataInitializer(ProductRepository productRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // Seed Products
        if (productRepository.count() == 0) {
            Product p1 = new Product(
                "Minimalist Leather Backpack",
                "Handcrafted premium leather backpack with a padded 15-inch laptop sleeve and modern styling.",
                120.00,
                "https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&q=80&w=400",
                "Bags",
                15
            );
            Product p2 = new Product(
                "Noise-Canceling Headphones",
                "Immersive over-ear headphones featuring state-of-the-art active noise cancellation and 30-hour battery.",
                199.99,
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400",
                "Electronics",
                20
            );
            Product p3 = new Product(
                "Ceramic Matte Coffee Mug",
                "Ergonomically designed matte mug perfect for your morning pour-over, finished with a smooth heat-retentive clay.",
                24.50,
                "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400",
                "Kitchenware",
                45
            );
            Product p4 = new Product(
                "Mechanical Keyboard (TKL)",
                "Tactile mechanical switches with retro-modern keycaps, RGB backlighting, and a solid aluminum chassis.",
                89.00,
                "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=400",
                "Electronics",
                8
            );
            Product p5 = new Product(
                "Unisex Organic Cotton Hoodie",
                "Super soft, fleece-lined comfort hoodie ethically made with 100% premium organic cotton fibers.",
                65.00,
                "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400",
                "Apparel",
                30
            );
            Product p6 = new Product(
                "Stainless Steel Water Bottle",
                "Double-wall vacuum insulated flask keeping cold drinks chilled for 24 hours or hot tea warm for 12 hours.",
                35.00,
                "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=400",
                "Lifestyle",
                50
            );

            productRepository.saveAll(Arrays.asList(p1, p2, p3, p4, p5, p6));
            System.out.println("H2 In-Memory Database initialized with 6 premium product items.");
        }

        // Seed Users
        if (userRepository.count() == 0) {
            User admin = new User(
                "admin",
                "admin@quantamart.com",
                passwordEncoder.encode("admin123"),
                Role.ADMIN
            );
            User seller = new User(
                "seller",
                "seller@quantamart.com",
                passwordEncoder.encode("seller123"),
                Role.SELLER
            );
            User customer = new User(
                "customer",
                "customer@quantamart.com",
                passwordEncoder.encode("customer123"),
                Role.CUSTOMER
            );

            userRepository.saveAll(Arrays.asList(admin, seller, customer));
            System.out.println("H2 In-Memory Database initialized with 3 default users (admin, seller, customer).");
        }
    }
}
