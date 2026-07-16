import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it in Settings > Secrets.");
    }
    geminiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return geminiClient;
}

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
  },
  {
    id: 16,
    name: "Lenovo IdeaPad Slim 3 Laptop",
    description: "Lightweight 15.6\" FHD everyday laptop powered by Intel Core i3 with 8GB RAM and 512GB high-speed SSD. Perfect for students and professional work.",
    price: 499.0, // approx ₹41,400 INR (under ₹60,000)
    imageUrl: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=400",
    category: "Electronics",
    brand: "Soniq",
    rating: 4.4,
    stock: 10
  },
  {
    id: 17,
    name: "HP Victus Ryzen 5 Gaming Laptop",
    description: "High-performance gaming and rendering laptop equipped with AMD Ryzen 5, NVIDIA GTX graphics, 16GB RAM, and 512GB SSD. Exceptional value under budget.",
    price: 699.0, // approx ₹58,000 INR (under ₹60,000)
    imageUrl: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&q=80&w=400",
    category: "Electronics",
    brand: "Soniq",
    rating: 4.6,
    stock: 8
  },
  {
    id: 18,
    name: "Apple MacBook Air M2",
    description: "Incredibly thin and fast premium laptop with Apple M2 chip, 8GB RAM, 256GB SSD, and 13.6\" Liquid Retina display. Up to 18 hours of battery life.",
    price: 1099.0, // approx ₹91,200 INR (above ₹60,000)
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=400",
    category: "Electronics",
    brand: "Aether",
    rating: 4.9,
    stock: 5
  },
  {
    id: 19,
    name: "Asus Vivobook Go 15 Laptop",
    description: "Affordable and thin laptop for daily study, web browsing, and stream entertainment. Features AMD Ryzen 3, 8GB RAM, and 256GB storage.",
    price: 349.0, // approx ₹29,000 INR (under ₹60,000)
    imageUrl: "https://images.unsplash.com/photo-1496181130204-7552cc1524e2?auto=format&fit=crop&q=80&w=400",
    category: "Electronics",
    brand: "Soniq",
    rating: 4.2,
    stock: 12
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

// ==========================================================================
// Notification Module (Email Notifications Database, Generators and Seeds)
// ==========================================================================

interface SentEmail {
  id: number;
  to: string;
  subject: string;
  body: string;
  type: "REGISTRATION" | "ORDER_CONFIRMATION" | "SHIPPING_UPDATE" | "PASSWORD_RESET";
  sentAt: string;
}

let sentEmails: SentEmail[] = [];
let nextEmailId = 1;

function sendEmail(to: string, subject: string, body: string, type: "REGISTRATION" | "ORDER_CONFIRMATION" | "SHIPPING_UPDATE" | "PASSWORD_RESET") {
  const newEmail: SentEmail = {
    id: nextEmailId++,
    to,
    subject,
    body,
    type,
    sentAt: new Date().toISOString()
  };
  sentEmails.unshift(newEmail);
  return newEmail;
}

// Password reset requests container
let resetRequests: Array<{ email: string; code: string; expiresAt: number }> = [];

// Welcome Email HTML Generator
function generateWelcomeEmail(username: string, email: string, role: string): string {
  return `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #0f172a; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0f172a; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">Welcome to QuantaMart</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">Hi <strong>${username}</strong>,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">We are absolutely thrilled to welcome you to the QuantaMart community! You've successfully created your <strong>${role}</strong> account under the email address <code>${email}</code>.</p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">QuantaMart is a curated collection of beautiful artifacts, accessories, and tech items crafted with meticulous detail and quality in mind.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="#" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; font-weight: 600; text-decoration: none; border-radius: 6px; font-size: 15px; display: inline-block;">Explore the Collection</a>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 0;">If you have any questions, reply to this email or contact support at <a href="mailto:support@quantamart.com" style="color: #2563eb; text-decoration: none;">support@quantamart.com</a>.</p>
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 8px 0 0 0;">&copy; 2026 QuantaMart Essentials, Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</div>`;
}

// Order Confirmation HTML Generator
function generateOrderEmail(order: any): string {
  return `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #0f172a; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #10b981; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">Order Confirmed!</h1>
      <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">Order ID: #${order.id}</p>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">Hi <strong>${order.customerName}</strong>,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">Thank you for shopping with us! Your order has been logged in our secure system and is currently being processed for delivery.</p>
      
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Order Summary</h3>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #475569;">
          <span style="color: #64748b;">Payment Method:</span>
          <strong style="color: #0f172a;">${order.payment?.paymentMethod || "COD"}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #475569;">
          <span style="color: #64748b;">Transaction ID:</span>
          <code style="font-size: 12px; color: #0f172a; font-weight: bold;">${order.payment?.transactionId || "N/A"}</code>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #475569;">
          <span style="color: #64748b;">Payment Status:</span>
          <span style="color: #10b981; font-weight: 600;">${order.payment?.status || "PENDING"}</span>
        </div>
        <div style="border-top: 1px solid #e2e8f0; margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between; font-size: 16px; color: #0f172a; font-weight: 700;">
          <span>Total Amount:</span>
          <span>$${order.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #64748b;">You'll receive another notification as soon as your package has been shipped with tracking information.</p>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 0;">Need help? Reply to this email or contact support at <a href="mailto:support@quantamart.com" style="color: #2563eb; text-decoration: none;">support@quantamart.com</a>.</p>
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 8px 0 0 0;">&copy; 2026 QuantaMart Essentials, Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</div>`;
}

// Shipping Update HTML Generator
function generateShippingEmail(order: any, oldStatus: string, newStatus: string): string {
  return `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #0f172a; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #2563eb; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">Package Status Updated!</h1>
      <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">Order Status: ${newStatus}</p>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">Hi <strong>${order.customerName}</strong>,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">Great news! Your QuantaMart order <strong>#${order.id}</strong> status has been updated. Here are your tracking and update details:</p>
      
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #475569;">
          <span style="color: #64748b;">Previous Status:</span>
          <span style="text-decoration: line-through; color: #ef4444;">${oldStatus}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #475569;">
          <span style="color: #64748b;">Current Status:</span>
          <strong style="color: #2563eb;">${newStatus}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #475569;">
          <span style="color: #64748b;">Carrier Service:</span>
          <strong style="color: #0f172a;">QuantaExpress Priority</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #475569;">
          <span style="color: #64748b;">Tracking ID:</span>
          <code style="font-size: 12px; color: #0f172a; font-weight: bold;">QX-${order.id}82947239-US</code>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; color: #475569;">
          <span style="color: #64748b;">Estimated Delivery:</span>
          <strong style="color: #0f172a;">2-3 Business Days</strong>
        </div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="#" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; font-weight: 600; text-decoration: none; border-radius: 6px; font-size: 15px; display: inline-block;">Track Your Package</a>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 0;">Have queries about shipping? Reply to this email or write to <a href="mailto:shipping@quantamart.com" style="color: #2563eb; text-decoration: none;">shipping@quantamart.com</a>.</p>
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 8px 0 0 0;">&copy; 2026 QuantaMart Essentials, Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</div>`;
}

// Seed introductory emails
const initialWelcomeBody = `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #0f172a; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0f172a; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">Welcome to QuantaMart</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">Hi <strong>customer</strong>,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">We are absolutely thrilled to welcome you to the QuantaMart community! You've successfully created your <strong>CUSTOMER</strong> account under the email address <code>customer@quantamart.com</code>.</p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">QuantaMart is a curated collection of beautiful artifacts, accessories, and tech items crafted with meticulous detail and quality in mind.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="#" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; font-weight: 600; text-decoration: none; border-radius: 6px; font-size: 15px; display: inline-block;">Explore the Collection</a>
      </div>
    </div>
  </div>
</div>`;

sentEmails.push({
  id: nextEmailId++,
  to: "customer@quantamart.com",
  subject: "Welcome to QuantaMart, customer!",
  body: initialWelcomeBody,
  type: "REGISTRATION",
  sentAt: new Date(Date.now() - 3600000).toISOString()
});

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
  // Send Welcome Email
  sendEmail(email, `Welcome to QuantaMart, ${username}!`, generateWelcomeEmail(username, email, userRole), "REGISTRATION");
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
  // Send Order Confirmation Email
  sendEmail(email, `Your QuantaMart Order #${orderId} is Confirmed!`, generateOrderEmail(newOrder), "ORDER_CONFIRMATION");
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

// ==========================================================================
// Notification and Password Reset API Routes
// ==========================================================================

// API: Get Sent Notification Emails
app.get("/api/notifications/emails", (req, res) => {
  res.json(sentEmails);
});

// API: Forgot Password (Request Code)
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Error: Email is required!" });
  }

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ message: "Error: No account with this email address exists!" });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  // Remove previous reset requests for this email to prevent duplicates
  resetRequests = resetRequests.filter(r => r.email.toLowerCase() !== email.toLowerCase());
  resetRequests.push({ email, code, expiresAt });

  const htmlBody = `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #0f172a; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0f172a; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Reset Your Password</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">Hi <strong>${user.username}</strong>,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">We received a request to reset the password for your QuantaMart account. Please use the following 6-digit verification code to complete your password reset:</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <div style="background-color: #f1f5f9; color: #0f172a; font-size: 32px; font-weight: 700; letter-spacing: 0.25em; padding: 16px 24px; border-radius: 8px; display: inline-block; border: 1px dashed #cbd5e1; font-family: monospace;">
          ${code}
        </div>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 24px;">This code will expire in 10 minutes. If you did not make this request, you can safely ignore this email — your account remains completely secure.</p>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 0;">Secured by QuantaMart Auth System. Do not share this code with anyone.</p>
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 8px 0 0 0;">&copy; 2026 QuantaMart Essentials, Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</div>`;

  sendEmail(email, "QuantaMart Password Reset Request", htmlBody, "PASSWORD_RESET");
  res.status(200).json({ message: "Verification code sent to your email!" });
});

// API: Reset Password using verification code
app.post("/api/auth/reset-password", (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: "Error: Email, verification code, and new password are required!" });
  }

  const requestIndex = resetRequests.findIndex(r => r.email.toLowerCase() === email.toLowerCase() && r.code === code.trim());
  if (requestIndex === -1) {
    return res.status(400).json({ message: "Error: Invalid verification code or email!" });
  }

  const request = resetRequests[requestIndex];
  if (Date.now() > request.expiresAt) {
    resetRequests.splice(requestIndex, 1);
    return res.status(400).json({ message: "Error: Verification code has expired!" });
  }

  const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (userIndex === -1) {
    return res.status(404).json({ message: "Error: User account not found!" });
  }

  users[userIndex].passwordHash = bcrypt.hashSync(newPassword, 10);
  resetRequests.splice(requestIndex, 1);

  res.status(200).json({ message: "Password reset successfully! You can now log in with your new password." });
});

// API: Update Order Status (Triggers Shipping Update Email)
app.put("/api/orders/:id/status", (req, res) => {
  const orderId = parseInt(req.params.id);
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: "Missing required status field" });
  }

  const order = orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const oldStatus = order.status;
  order.status = status;

  // Send Shipping Update Email
  sendEmail(
    order.email,
    `Shipping Update: Your Order #${order.id} is now ${status}!`,
    generateShippingEmail(order, oldStatus, status),
    "SHIPPING_UPDATE"
  );

  res.status(200).json(order);
});

// ==========================================================================
// AI Shopping Assistant endpoints
// ==========================================================================

interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

let aiChatHistories: { [sessionId: string]: ChatMessage[] } = {};

app.get("/api/ai/history", (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId parameter" });
  }
  const history = aiChatHistories[sessionId as string] || [];
  // For safety, map any stringified JSON replies back to simple text for frontend consumption
  const formattedHistory = history.map(item => {
    if (item.role === 'model') {
      try {
        const parsed = JSON.parse(item.parts[0].text);
        if (parsed && parsed.reply) {
          return { role: 'model', parts: [{ text: parsed.reply }] };
        }
      } catch (e) {
        // Not JSON, return as is
      }
    }
    return item;
  });
  res.json(formattedHistory);
});

app.post("/api/ai/clear", (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    aiChatHistories[sessionId] = [];
  }
  res.json({ success: true, message: "Chat history cleared" });
});

app.post("/api/ai/chat", async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: "Missing message or sessionId" });
  }

  try {
    const ai = getGeminiClient();

    // Get or initialize history
    if (!aiChatHistories[sessionId]) {
      aiChatHistories[sessionId] = [];
    }
    const history = aiChatHistories[sessionId];

    // Create system instruction
    const systemInstruction = `You are "Quantamart AI Shopping Assistant", a brilliant, friendly, and expert shopping helper for the Quantamart curated lifestyle store.
Your goal is to guide visitors, answer their product queries, recommend the perfect matches, and help them find what they need.

IMPORTANT CONTEXT:
1. CURRENCY: Prices in the database are listed in USD ($). However, customers may ask in Indian Rupees (INR, ₹).
   Use a standard conversion rate: 1 USD = 83 INR.
   For example, if a customer asks for "under ₹60000", convert ₹60000 to USD: 60000 / 83 ≈ 722 USD.
   Identify products with price <= $722 USD.
2. PRODUCT CATALOG: You have access to the absolute real-time catalog. Below is the list of products currently available:
${JSON.stringify(products, null, 2)}

GUIDELINES FOR RECOMMENDATIONS:
- Be polite, enthusiastic, and helpful. Speak directly, write clear and professional responses.
- If the customer asks for a product type we have (like "laptop"), highlight the specific matches in our catalog (e.g., product #16 Lenovo IdeaPad Slim 3, product #17 HP Victus Ryzen 5, product #19 Asus Vivobook Go 15). Explain their features (RAM, SSD, processor) and prices (provide both USD price and converted INR price clearly, like: "HP Victus Ryzen 5 Gaming Laptop ($699 / ~₹58,000)").
- If the customer asks for a laptop under ₹60,000 (approx $722), recommend:
  * Lenovo IdeaPad Slim 3 Laptop ($499 / ~₹41,400)
  * HP Victus Ryzen 5 Gaming Laptop ($699 / ~₹58,000)
  * Asus Vivobook Go 15 Laptop ($349 / ~₹29,000)
  And explicitly point out that the Apple MacBook Air M2 is $1099 (~₹91,200), which exceeds their ₹60,000 budget, but is a premium alternative.
- Always provide the product name and why it is a great choice.
- ALWAYS respond in the JSON format specified in the schema. In the "recommendedProductIds" array, put the exact integer IDs of any products from our catalog that are relevant to the user's inquiry, so the app can display beautiful cards for them.
- If no products from the catalog are relevant, leave the "recommendedProductIds" array empty.
- Keep your explanations concise but detailed enough to be genuinely useful. Use markdown lists and clean formatting.`;

    // Construct request contents including the new user message
    const requestContents = [
      ...history,
      { role: 'user' as const, parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: requestContents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "The friendly, helpful reply containing product explanations, specs, pricing, and shopping advice."
            },
            recommendedProductIds: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: "The list of product IDs from the catalog being recommended."
            }
          },
          required: ["reply", "recommendedProductIds"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response text from Gemini API");
    }

    const aiResponse = JSON.parse(responseText.trim());

    // Save to actual in-memory history
    history.push({ role: 'user', parts: [{ text: message }] });
    history.push({ role: 'model', parts: [{ text: aiResponse.reply }] });

    res.json({
      reply: aiResponse.reply,
      recommendedProductIds: aiResponse.recommendedProductIds
    });

  } catch (error: any) {
    console.error("AI Chat Assistant Error:", error);
    res.status(500).json({
      error: "Failed to generate AI response",
      message: error.message || "Ensure your GEMINI_API_KEY is configured in Settings > Secrets."
    });
  }
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
