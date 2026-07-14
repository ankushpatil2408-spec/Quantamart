import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const app = express();
const PORT = 3000;

app.use(express.json());

const JWT_SECRET = "SuperSecureSecretKeyThatIsAtLeast256BitsLongAndSafeToUseForJWTTokenSigning123!";

// Mock Users Database matching Spring Boot DataInitializer seeding
let users = [
  {
    id: 1,
    username: "admin",
    email: "admin@quantamart.com",
    passwordHash: bcrypt.hashSync("admin123", 10),
    role: "ADMIN"
  },
  {
    id: 2,
    username: "seller",
    email: "seller@quantamart.com",
    passwordHash: bcrypt.hashSync("seller123", 10),
    role: "SELLER"
  },
  {
    id: 3,
    username: "customer",
    email: "customer@quantamart.com",
    passwordHash: bcrypt.hashSync("customer123", 10),
    role: "CUSTOMER"
  }
];

// Mock Products Database
let products = [
  {
    id: 1,
    name: "Minimalist Leather Backpack",
    description: "Handcrafted premium leather backpack with a padded 15-inch laptop sleeve and modern styling.",
    price: 120.0,
    imageUrl: "https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&q=80&w=400",
    category: "Bags",
    stock: 15
  },
  {
    id: 2,
    name: "Noise-Canceling Headphones",
    description: "Immersive over-ear headphones featuring state-of-the-art active noise cancellation and 30-hour battery.",
    price: 199.99,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400",
    category: "Electronics",
    stock: 20
  },
  {
    id: 3,
    name: "Ceramic Matte Coffee Mug",
    description: "Ergonomically designed matte mug perfect for your morning pour-over, finished with a smooth heat-retentive clay.",
    price: 24.5,
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400",
    category: "Kitchenware",
    stock: 45
  },
  {
    id: 4,
    name: "Mechanical Keyboard (TKL)",
    description: "Tactile mechanical switches with retro-modern keycaps, RGB backlighting, and a solid aluminum chassis.",
    price: 89.0,
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=400",
    category: "Electronics",
    stock: 8
  },
  {
    id: 5,
    name: "Unisex Organic Cotton Hoodie",
    description: "Super soft, fleece-lined comfort hoodie ethically made with 100% premium organic cotton fibers.",
    price: 65.0,
    imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400",
    category: "Apparel",
    stock: 30
  },
  {
    id: 6,
    name: "Stainless Steel Water Bottle",
    description: "Double-wall vacuum insulated flask keeping cold drinks chilled for 24 hours or hot tea warm for 12 hours.",
    price: 35.0,
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=400",
    category: "Lifestyle",
    stock: 50
  }
];

// Mock Orders Database
let orders: Array<{
  id: number;
  customerName: string;
  email: string;
  totalAmount: number;
  status: string;
}> = [];

// API: Register
app.post("/api/auth/register", (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: "Error: Missing required fields!" });
  }
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ message: "Error: Username is already taken!" });
  }
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ message: "Error: Email is already in use!" });
  }

  const userRole = (role || "CUSTOMER").toUpperCase();
  if (!["ADMIN", "CUSTOMER", "SELLER"].includes(userRole)) {
    return res.status(400).json({ message: "Error: Invalid Role type. Choose from ADMIN, CUSTOMER, SELLER." });
  }

  const newUser = {
    id: users.length + 1,
    username,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: userRole
  };

  users.push(newUser);
  res.status(200).json({ message: "User registered successfully!" });
});

// API: Login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Error: Missing username or password!" });
  }

  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(400).json({ message: "Error: Invalid username or password!" });
  }

  const token = jwt.sign({ sub: user.username, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

  res.status(200).json({
    token,
    type: "Bearer",
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  });
});

// API: Get All Products
app.get("/api/products", (req, res) => {
  res.json(products);
});

// API: Get Product By ID
app.get("/api/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

// API: Create Order
app.post("/api/orders", (req, res) => {
  const { customerName, email, totalAmount, status } = req.body;
  if (!customerName || !email || !totalAmount) {
    return res.status(400).json({ error: "Missing required order fields" });
  }

  const newOrder = {
    id: orders.length + 1,
    customerName,
    email,
    totalAmount: parseFloat(totalAmount),
    status: status || "PENDING"
  };

  orders.push(newOrder);
  res.status(201).json(newOrder);
});

// Serve static assets
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticPath = path.join(__dirname, "src/main/resources/static");

app.use(express.static(staticPath));

// Fallback all other routes to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
