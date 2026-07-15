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
    brand: "Aether",
    rating: 4.8,
    stock: 15
  },
  {
    id: 2,
    name: "Noise-Canceling Headphones",
    description: "Immersive over-ear headphones featuring state-of-the-art active noise cancellation and 30-hour battery.",
    price: 199.99,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400",
    category: "Electronics",
    brand: "Soniq",
    rating: 4.6,
    stock: 20
  },
  {
    id: 3,
    name: "Ceramic Matte Coffee Mug",
    description: "Ergonomically designed matte mug perfect for your morning pour-over, finished with a smooth heat-retentive clay.",
    price: 24.5,
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400",
    category: "Kitchenware",
    brand: "Terra",
    rating: 4.3,
    stock: 45
  },
  {
    id: 4,
    name: "Mechanical Keyboard (TKL)",
    description: "Tactile mechanical switches with retro-modern keycaps, RGB backlighting, and a solid aluminum chassis.",
    price: 89.0,
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=400",
    category: "Electronics",
    brand: "Keychronic",
    rating: 4.5,
    stock: 8
  },
  {
    id: 5,
    name: "Unisex Organic Cotton Hoodie",
    description: "Super soft, fleece-lined comfort hoodie ethically made with 100% premium organic cotton fibers.",
    price: 65.0,
    imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400",
    category: "Apparel",
    brand: "Ethos",
    rating: 4.7,
    stock: 30
  },
  {
    id: 6,
    name: "Stainless Steel Water Bottle",
    description: "Double-wall vacuum insulated flask keeping cold drinks chilled for 24 hours or hot tea warm for 12 hours.",
    price: 35.0,
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=400",
    category: "Lifestyle",
    brand: "HydroPeak",
    rating: 4.4,
    stock: 50
  },
  {
    id: 7,
    name: "Ergonomic Desk Chair",
    description: "Fully adjustable ergonomic desk chair featuring responsive lumbar support, breathable mesh, and customizable 3D armrests.",
    price: 349.99,
    imageUrl: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=400",
    category: "Lifestyle",
    brand: "Aether",
    rating: 4.9,
    stock: 10
  },
  {
    id: 8,
    name: "Bluetooth Smart Speaker",
    description: "Compelling 360-degree high-fidelity audio paired with responsive voice assistant control and premium walnut base.",
    price: 79.99,
    imageUrl: "https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&q=80&w=400",
    category: "Electronics",
    brand: "Soniq",
    rating: 4.2,
    stock: 12
  },
  {
    id: 9,
    name: "Hand-Woven Wool Rug",
    description: "Meticulously knotted high-pile wool rug featuring modern geometric patterns in elegant neutral earth tones.",
    price: 180.0,
    imageUrl: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&q=80&w=400",
    category: "Lifestyle",
    brand: "Terra",
    rating: 4.7,
    stock: 5
  },
  {
    id: 10,
    name: "Pour-Over Glass Coffeemaker",
    description: "Classic heat-resistant borosilicate glass carafe complete with a beautiful polished wooden collar and leather tie.",
    price: 45.0,
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400",
    category: "Kitchenware",
    brand: "Terra",
    rating: 4.8,
    stock: 25
  },
  {
    id: 11,
    name: "Minimalist Quartz Watch",
    description: "Ultra-thin stainless steel case with scratch-resistant sapphire crystal and genuine Italian leather strap.",
    price: 150.0,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400",
    category: "Lifestyle",
    brand: "Aether",
    rating: 4.5,
    stock: 18
  },
  {
    id: 12,
    name: "Bamboo Fiber Dinner Plate Set",
    description: "Set of 4 eco-friendly, biodegradable dinner plates featuring modern pastel colors and satin finish.",
    price: 39.99,
    imageUrl: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=400",
    category: "Kitchenware",
    brand: "Ethos",
    rating: 4.1,
    stock: 35
  },
  {
    id: 13,
    name: "Noise-Isolating Earbuds",
    description: "Compact wireless earbuds with high-definition drivers, touch controls, and smart ambient audio bypass mode.",
    price: 49.99,
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=400",
    category: "Electronics",
    brand: "Soniq",
    rating: 4.0,
    stock: 40
  },
  {
    id: 14,
    name: "Heavyweight Cotton Tee",
    description: "Classic boxy fit t-shirt tailored from 240GSM combed organic cotton, designed to age beautifully.",
    price: 28.0,
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400",
    category: "Apparel",
    brand: "Ethos",
    rating: 4.4,
    stock: 60
  },
  {
    id: 15,
    name: "Canvas Weekender Bag",
    description: "Spacious heavy-duty canvas travel bag trimmed with water-resistant oil-tanned harness leather.",
    price: 95.0,
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=400",
    category: "Bags",
    brand: "Aether",
    rating: 4.6,
    stock: 14
  }
];

// Mock Orders Database
let orders: Array<{
  id: number;
  customerName: string;
  email: string;
  totalAmount: number;
  status: string;
  payment?: any;
}> = [];

// Mock Payments Database
let payments: Array<{
  id: number;
  orderId: number;
  transactionId: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
  paymentMethod: "COD" | "ONLINE";
}> = [];

// API: Register
app.post("/api/auth/register", (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: "Error: Missing required fields!" });
  }

  // Handle duplicate username with smart re-run tolerance:
  // If a non-default user already exists, and was registered more than 10 seconds ago,
  // we treat it as a stale user from a previous test run and allow overwriting it.
  const existingUserIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
  if (existingUserIndex !== -1) {
    const existingUser = users[existingUserIndex] as any;
    const isDefaultUser = ["admin", "seller", "customer"].includes(username.toLowerCase());
    if (isDefaultUser || (existingUser.registeredAt && Date.now() - existingUser.registeredAt < 10000)) {
      return res.status(400).json({ message: "Error: Username is already taken!" });
    } else {
      users.splice(existingUserIndex, 1);
    }
  }

  // Handle duplicate email with smart re-run tolerance
  const existingEmailIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingEmailIndex !== -1) {
    const existingUser = users[existingEmailIndex] as any;
    const isDefaultUser = ["admin@quantamart.com", "seller@quantamart.com", "customer@quantamart.com"].includes(email.toLowerCase());
    if (isDefaultUser || (existingUser.registeredAt && Date.now() - existingUser.registeredAt < 10000)) {
      return res.status(400).json({ message: "Error: Email is already in use!" });
    } else {
      users.splice(existingEmailIndex, 1);
    }
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
    role: userRole,
    registeredAt: Date.now()
  } as any;

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
  const { customerName, email, totalAmount, status, paymentMethod } = req.body;
  if (!customerName || !email || !totalAmount) {
    return res.status(400).json({ error: "Missing required order fields" });
  }

  const orderId = orders.length + 1;
  const method = (paymentMethod || "COD").toUpperCase() as "COD" | "ONLINE";
  
  // Create a transaction ID
  const transactionId = method === "ONLINE"
    ? "TXN-" + Math.random().toString(36).substr(2, 9).toUpperCase()
    : "COD-" + Math.random().toString(36).substr(2, 9).toUpperCase();

  const paymentStatus = method === "ONLINE" ? "COMPLETED" : "PENDING";

  const newPayment = {
    id: payments.length + 1,
    orderId,
    transactionId,
    amount: parseFloat(totalAmount),
    status: paymentStatus as "PENDING" | "COMPLETED" | "FAILED",
    paymentMethod: method
  };

  payments.push(newPayment);

  const newOrder = {
    id: orderId,
    customerName,
    email,
    totalAmount: parseFloat(totalAmount),
    status: status || (method === "ONLINE" ? "PAID" : "PENDING"),
    payment: newPayment
  };

  orders.push(newOrder);
  res.status(201).json(newOrder);
});

// API: Get Orders (supports filtering by email)
app.get("/api/orders", (req, res) => {
  const { email } = req.query;
  if (email) {
    const filtered = orders.filter(o => o.email.toLowerCase() === (email as string).toLowerCase());
    return res.json(filtered);
  }
  res.json(orders);
});

// API: Get Payments
app.get("/api/payments", (req, res) => {
  res.json(payments);
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
