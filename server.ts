import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

const app = express();
const PORT = 3000;

app.use(express.json());

// ==========================================================================
// Local JSON File Database Persistence Support
// ==========================================================================
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSON<T>(filename: string, defaultValue: T): T {
  const filePath = path.join(DATA_DIR, filename);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (e) {
      console.error(`Error reading database file ${filename}:`, e);
    }
  }
  // Write default values immediately to establish the schema file
  saveJSON(filename, defaultValue);
  return defaultValue;
}

function saveJSON<T>(filename: string, data: T) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error(`Error writing database file ${filename}:`, e);
  }
}

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
const DEFAULT_USERS = [
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

let users = loadJSON("users.json", DEFAULT_USERS);

// Mock Products Database
const DEFAULT_PRODUCTS = [
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

let products = loadJSON("products.json", DEFAULT_PRODUCTS);

// Mock Orders Database
let orders = loadJSON<Array<{
  id: number;
  customerName: string;
  email: string;
  totalAmount: number;
  status: string;
  payment?: any;
}>>("orders.json", []);

// Mock Payments Database
let payments = loadJSON<Array<{
  id: number;
  orderId: number;
  transactionId: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
  paymentMethod: "COD" | "ONLINE";
}>>("payments.json", []);

// ==========================================================================
// Notification Module (Email Notifications Database, Generators and Seeds)
// ==========================================================================

interface SentEmail {
  id: number;
  to: string;
  subject: string;
  body: string;
  type: "REGISTRATION" | "ORDER_CONFIRMATION" | "SHIPPING_UPDATE" | "PASSWORD_RESET" | "CONTACT_FORM";
  sentAt: string;
}

let sentEmails: SentEmail[] = loadJSON<SentEmail[]>("sentEmails.json", []);
let nextEmailId = sentEmails.length > 0 ? Math.max(...sentEmails.map(e => e.id)) + 1 : 1;

function sendEmail(to: string, subject: string, body: string, type: "REGISTRATION" | "ORDER_CONFIRMATION" | "SHIPPING_UPDATE" | "PASSWORD_RESET" | "CONTACT_FORM") {
  const newEmail: SentEmail = {
    id: nextEmailId++,
    to,
    subject,
    body,
    type,
    sentAt: new Date().toISOString()
  };
  sentEmails.unshift(newEmail);
  saveJSON("sentEmails.json", sentEmails);
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

if (sentEmails.length === 0) {
  sentEmails.push({
    id: nextEmailId++,
    to: "customer@quantamart.com",
    subject: "Welcome to QuantaMart, customer!",
    body: initialWelcomeBody,
    type: "REGISTRATION",
    sentAt: new Date(Date.now() - 3600000).toISOString()
  });
  saveJSON("sentEmails.json", sentEmails);
}

// Seed VIP User, Orders, and Emails for Ankush Patil
function seedAnkushPatil() {
  // 1. Seed user account
  const hasAnkushUser = users.some(u => u.email.toLowerCase() === "ankushpatil.2408@gmail.com" || u.username.toLowerCase() === "ankush");
  if (!hasAnkushUser) {
    // Remove duplicate/stale incomplete accounts
    users = users.filter(u => u.username.toLowerCase() !== "ankushp" && u.email.toLowerCase() !== "ankush@example.com");
    users.push({
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 4,
      username: "ankush",
      email: "ankushpatil.2408@gmail.com",
      passwordHash: bcrypt.hashSync("ankush123", 10),
      role: "CUSTOMER",
      fullName: "Ankush Patil",
      registeredAt: Date.now()
    });
    saveJSON("users.json", users);
  }

  // 2. Seed orders & payments
  const hasAnkushOrders = orders.some(o => o.email.toLowerCase() === "ankushpatil.2408@gmail.com");
  if (!hasAnkushOrders) {
    const o1 = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1001;
    const o2 = o1 + 1;
    const p1 = payments.length > 0 ? Math.max(...payments.map(p => p.id)) + 1 : 1;
    const p2 = p1 + 1;

    const payment1 = {
      id: p1,
      orderId: o1,
      transactionId: "TXN-ANKS" + Math.floor(100000 + Math.random() * 900000),
      amount: 194.40,
      status: "COMPLETED" as const,
      paymentMethod: "ONLINE" as const
    };
    const payment2 = {
      id: p2,
      orderId: o2,
      transactionId: "COD-ANKS" + Math.floor(100000 + Math.random() * 900000),
      amount: 180.00,
      status: "PENDING" as const,
      paymentMethod: "COD" as const
    };

    payments.push(payment1, payment2);
    saveJSON("payments.json", payments);

    const order1 = {
      id: o1,
      customerName: "Ankush Patil",
      email: "ankushpatil.2408@gmail.com",
      totalAmount: 194.40,
      status: "DELIVERED",
      payment: payment1
    };
    const order2 = {
      id: o2,
      customerName: "Ankush Patil",
      email: "ankushpatil.2408@gmail.com",
      totalAmount: 180.00,
      status: "SHIPPED",
      payment: payment2
    };

    orders.push(order1, order2);
    saveJSON("orders.json", orders);

    // 3. Seed emails
    const welcomeText = `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #0f172a; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0f172a; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">Welcome, Ankush!</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">Hi <strong>Ankush Patil</strong>,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">We are absolutely thrilled to welcome you to the QuantaMart community! You've successfully activated your VIP account under your personal email address <code>ankushpatil.2408@gmail.com</code>.</p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">As a premium VIP member, you have access to exclusive products, priority checkout services, and simulated workspace tools inside the Developer Console.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="#" style="background-color: #0f172a; color: #ffffff; padding: 12px 28px; font-weight: 600; text-decoration: none; border-radius: 6px; font-size: 15px; display: inline-block;">Start Exploring</a>
      </div>
    </div>
  </div>
</div>`;

    sentEmails.unshift({
      id: nextEmailId++,
      to: "ankushpatil.2408@gmail.com",
      subject: "Welcome to QuantaMart, Ankush Patil! (VIP Account Activated)",
      body: welcomeText,
      type: "REGISTRATION",
      sentAt: new Date(Date.now() - 7200000).toISOString()
    });

    sentEmails.unshift({
      id: nextEmailId++,
      to: "ankushpatil.2408@gmail.com",
      subject: `Your QuantaMart Order #${o1} is Confirmed!`,
      body: generateOrderEmail(order1),
      type: "ORDER_CONFIRMATION",
      sentAt: new Date(Date.now() - 3600000).toISOString()
    });

    saveJSON("sentEmails.json", sentEmails);
  }
}

seedAnkushPatil();

// ==========================================================================
// Advanced Feature Databases & Helpers for full-stack Workspace Support
// ==========================================================================

let DEFAULT_COUPONS = [
  { code: "WELCOME10", discountPercent: 10, description: "10% off for new customers", active: true },
  { code: "QUANTA20", discountPercent: 20, description: "20% off site-wide discount", active: true }
];
let coupons = loadJSON("coupons.json", DEFAULT_COUPONS);

let returnRequests = loadJSON<Array<{
  id: number;
  orderId: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  refundAmount: number;
  requestedAt: string;
}>>("returnRequests.json", []);

let DEFAULT_AUDIT_LOGS = [
  { timestamp: new Date(Date.now() - 300000).toISOString(), event: "SYSTEM_BOOTSTRAP", user: "SYSTEM", ip: "127.0.0.1", status: "SUCCESS" },
  { timestamp: new Date(Date.now() - 240000).toISOString(), event: "DB_SEED", user: "SYSTEM", ip: "127.0.0.1", status: "SUCCESS" },
  { timestamp: new Date(Date.now() - 180000).toISOString(), event: "PORT_BIND", user: "SYSTEM", ip: "0.0.0.0", status: "SUCCESS" }
];
let auditLogs = loadJSON("auditLogs.json", DEFAULT_AUDIT_LOGS);

function logEvent(event: string, user: string, status: string, ip: string = "127.0.0.1") {
  auditLogs.unshift({
    timestamp: new Date().toISOString(),
    event,
    user,
    ip,
    status
  });
  if (auditLogs.length > 100) auditLogs.pop();
  saveJSON("auditLogs.json", auditLogs);
}

// API: Register
app.post("/api/auth/register", (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    logEvent("USER_REGISTER", username || "unknown", "FAILED_MISSING_FIELDS");
    return res.status(400).json({ message: "Error: Missing required fields!" });
  }

  const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existingUser) {
    logEvent("USER_REGISTER", username, "FAILED_DUPLICATE_USERNAME");
    return res.status(400).json({ message: "Error: Username is already taken!" });
  }

  const existingEmail = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingEmail) {
    logEvent("USER_REGISTER", username, "FAILED_DUPLICATE_EMAIL");
    return res.status(400).json({ message: "Error: Email is already in use!" });
  }

  const userRole = (role || "CUSTOMER").toUpperCase();
  if (!["ADMIN", "CUSTOMER", "SELLER"].includes(userRole)) {
    logEvent("USER_REGISTER", username, "FAILED_INVALID_ROLE");
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
  saveJSON("users.json", users);
  sendEmail(email, `Welcome to QuantaMart, ${username}!`, generateWelcomeEmail(username, email, userRole), "REGISTRATION");
  logEvent("USER_REGISTER", username, "SUCCESS");
  res.status(200).json({ message: "User registered successfully!" });
});

// API: Login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    logEvent("USER_LOGIN", username || "unknown", "FAILED_MISSING_CREDENTIALS");
    return res.status(400).json({ message: "Error: Missing username or password!" });
  }

  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    logEvent("USER_LOGIN", username, "FAILED_INVALID_CREDENTIALS");
    return res.status(400).json({ message: "Error: Invalid username or password!" });
  }

  if ((user as any).active === false) {
    logEvent("USER_LOGIN", username, "FAILED_SUSPENDED_ACCOUNT");
    return res.status(400).json({ message: "Error: Your account has been suspended by an administrator." });
  }

  const token = jwt.sign({ sub: user.username, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  logEvent("USER_LOGIN", username, "SUCCESS");

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
  saveJSON("payments.json", payments);

  const newOrder = {
    id: orderId,
    customerName,
    email,
    totalAmount: parseFloat(totalAmount),
    status: status || (method === "ONLINE" ? "PAID" : "PENDING"),
    payment: newPayment
  };

  orders.push(newOrder);
  saveJSON("orders.json", orders);
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

// API: Submit Contact Inquiry Form
app.post("/api/contact", (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "Missing required fields! (name, email, subject, message)" });
  }

  const refCode = `QMT-CON-${Math.floor(100000 + Math.random() * 900000)}`;
  const htmlBody = `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #0f172a; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0f172a; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Inquiry Received!</h1>
      <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Reference: ${refCode}</p>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">Hi <strong>${name}</strong>,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">Thank you for reaching out to us at QuantaMart. We have successfully received your message and our customer support team is already reviewing it.</p>
      
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #cbd5e1;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Your Inquiry Details</h3>
        <p style="font-size: 14px; margin: 0 0 8px 0;"><strong>Subject:</strong> ${subject}</p>
        <p style="font-size: 14px; margin: 0 0 12px 0;"><strong>Message:</strong></p>
        <div style="font-size: 13px; color: #475569; line-height: 1.5; background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-style: italic;">
          ${message.replace(/\n/g, '<br>')}
        </div>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 24px;">Our representative will reply to you at <strong>${email}</strong> within 12-24 business hours. Thank you for your patience.</p>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 0;">This is a simulated transactional notification from your QuantaMart preview workspace.</p>
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 8px 0 0 0;">&copy; 2026 QuantaMart Essentials, Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</div>`;

  sendEmail(email, `We received your inquiry: "${subject}" [${refCode}]`, htmlBody, "CONTACT_FORM");
  res.status(200).json({ success: true, reference: refCode });
});

// API: Newsletter Subscription
app.post("/api/newsletter/subscribe", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Missing email address!" });
  }

  const refCode = `QMT-NEWS-${Math.floor(100000 + Math.random() * 900000)}`;
  const htmlBody = `
<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #0f172a; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0f172a; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Welcome to the Circle!</h1>
      <p style="color: #cbd5e1; margin: 8px 0 0 0; font-size: 14px;">QuantaMart Curated Newsletter • Ref: ${refCode}</p>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">Hi there,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">Thank you for subscribing to our curated newsletter circle. You've joined a selected collective of design enthusiasts who appreciate meticulously sourced, beautifully crafted lifestyle goods.</p>
      
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin: 24px 0; border: 1px solid #e2e8f0; text-align: center;">
        <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Your Welcome Gift Code</span>
        <div style="font-family: 'Space Grotesk', 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #0f172a; letter-spacing: 0.05em; background: #ffffff; padding: 12px; border-radius: 6px; border: 1px dashed #cbd5e1; display: inline-block;">
          WELCOME10
        </div>
        <p style="font-size: 13px; color: #64748b; margin: 12px 0 0 0;">Enter this code during checkout to enjoy an instant <strong>10% discount</strong> on your first order.</p>
      </div>

      <h3 style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 24px; margin-bottom: 12px;">What to Expect</h3>
      <ul style="font-size: 14px; color: #475569; line-height: 1.6; padding-left: 20px; margin: 0 0 24px 0;">
        <li style="margin-bottom: 8px;"><strong>Curated Catalog Releases:</strong> Early VIP access to our limited-edition lifestyle artifacts.</li>
        <li style="margin-bottom: 8px;"><strong>Design Essays:</strong> Thoughts on minimal architecture, sustainable manufacturing, and form-meets-function philosophy.</li>
        <li style="margin-bottom: 8px;"><strong>Private Promotions:</strong> Exclusive subscriber-only events and seasonal savings.</li>
      </ul>

      <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 24px;">If you ever wish to unsubscribe, you can do so by clicking the "unsubscribe" link at the bottom of any subsequent email, or managing your circle settings. We're thrilled to have you with us.</p>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 0;">This is a simulated transactional notification from your QuantaMart preview workspace.</p>
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 8px 0 0 0;">&copy; 2026 QuantaMart Essentials, Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</div>`;

  sendEmail(email, `Welcome to the QuantaMart Circle! (10% Discount Code Inside)`, htmlBody, "REGISTRATION");
  res.status(200).json({ success: true, reference: refCode });
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
  saveJSON("users.json", users);
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
  saveJSON("orders.json", orders);

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
// AI Product Recommendations Engine
// ==========================================================================
app.post("/api/ai/recommendations", async (req, res) => {
  const { currentProductId, cartProductIds, orderHistoryProductIds } = req.body;
  if (!currentProductId) {
    return res.status(400).json({ error: "Missing currentProductId" });
  }

  try {
    const ai = getGeminiClient();

    // Find the current product being viewed
    const currentProduct = products.find(p => p.id === parseInt(currentProductId));
    if (!currentProduct) {
      return res.status(404).json({ error: "Current product not found in catalog" });
    }

    // Get cart products
    const cartProducts = (cartProductIds || []).map((id: any) => products.find(p => p.id === parseInt(id))).filter(Boolean);
    
    // Get ordered products
    const orderedProducts = (orderHistoryProductIds || []).map((id: any) => products.find(p => p.id === parseInt(id))).filter(Boolean);

    // Prompt instructions for Gemini
    const systemInstruction = `You are the "Quantamart AI Product Recommendation Engine", a high-end personal styling and product matchmaking helper.
Your goal is to recommend exactly 3 products from the available catalog that go beautifully with the product the user is currently viewing (the "Target Product").

Use the user's current shopping cart or purchase history (if provided) to personalize the matches.
For example, if the Target Product is a coffee mug and they have a coffeemaker in their cart, explain how they make a pristine kitchen set. If the Target Product is a hoodie, you could recommend a cotton tee or backpack.

AVAILABLE CATALOG:
${JSON.stringify(products, null, 2)}

STRICT CONSTRAINTS:
1. Do NOT recommend the Target Product itself.
2. Select EXACTLY 3 products from the available catalog.
3. For each recommended product, write a single concise, engaging, and professional sentence explaining exactly WHY this product complements or pairs beautifully with the Target Product (e.g., "Pair this minimalist leather backpack with our organic cotton hoodie for a clean, sustainable everyday look").
4. ALWAYS respond strictly in the JSON format matching the schema provided.`;

    const contents = `
Target Product: ${JSON.stringify(currentProduct)}
User's Cart Products: ${JSON.stringify(cartProducts)}
User's Purchase History: ${JSON.stringify(orderedProducts)}

Please recommend 3 products.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: {
                    type: Type.INTEGER,
                    description: "The exact integer ID of the recommended product."
                  },
                  reason: {
                    type: Type.STRING,
                    description: "A single, highly personalized, beautiful matchmaking sentence."
                  }
                },
                required: ["productId", "reason"]
              }
            }
          },
          required: ["recommendations"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response text from Gemini API");
    }

    const parsed = JSON.parse(responseText.trim());
    
    // Enrich recommendations with full product detail
    const enrichedRecommendations = parsed.recommendations.map((rec: any) => {
      const prod = products.find(p => p.id === rec.productId);
      if (prod) {
        return {
          ...prod,
          reason: rec.reason
        };
      }
      return null;
    }).filter(Boolean);

    // Fallback if less than 3 products returned or invalid IDs
    if (enrichedRecommendations.length < 3) {
      const existingIds = enrichedRecommendations.map((r: any) => r.id);
      const remainingFallbacks = products
        .filter(p => p.id !== currentProduct.id && !existingIds.includes(p.id))
        .sort((a, b) => b.rating - a.rating); // high rating first

      while (enrichedRecommendations.length < 3 && remainingFallbacks.length > 0) {
        const p = remainingFallbacks.shift();
        if (p) {
          enrichedRecommendations.push({
            ...p,
            reason: `A highly-rated favorite from our ${p.category} collection that matches the style.`
          });
        }
      }
    }

    res.json({ recommendations: enrichedRecommendations.slice(0, 3) });

  } catch (error: any) {
    console.error("AI Recommendation Error:", error);
    // Bulletproof heuristic fallback in case of rate limits or empty/bad keys
    const currentProduct = products.find(p => p.id === parseInt(currentProductId));
    const fallbacks = products
      .filter(p => !currentProduct || p.id !== currentProduct.id)
      .sort((a, b) => (currentProduct && p.category === currentProduct.category ? -1 : 1)) // favor same category
      .slice(0, 3)
      .map(p => ({
        ...p,
        reason: `Popular choice in our ${p.category} department that other style-conscious customers bought.`
      }));
    res.json({ recommendations: fallbacks });
  }
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

// ==========================================================================
// WORKSPACE CONSOLE & DEVELOPER SANDBOX API ENDPOINTS
// ==========================================================================

// Upload New Product (Seller Portal)
app.post("/api/products", (req, res) => {
  const { name, description, price, category, brand, rating, stock, imageUrl, specifications } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ error: "Missing required fields (name, price, category)." });
  }

  const newId = products.length + 1;
  const newProduct = {
    id: newId,
    name,
    description: description || "Curated premium lifestyle essential.",
    price: parseFloat(price),
    imageUrl: imageUrl || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400",
    category,
    brand: brand || "Quanta",
    rating: parseFloat(rating) || 4.5,
    stock: parseInt(stock) || 15,
    specifications: specifications || []
  };

  products.push(newProduct);
  saveJSON("products.json", products);
  logEvent("PRODUCT_UPLOADED", "SELLER", `Product ID: ${newId} (${name}) uploaded successfully.`, req.ip);
  res.status(201).json(newProduct);
});

// Get Platform Users Directory (Admin Panel)
app.get("/api/admin/users", (req, res) => {
  const safeUsers = users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    active: (u as any).active !== false
  }));
  res.json(safeUsers);
});

// Toggle Account Status (Admin Panel)
app.post("/api/admin/users/:id/toggle", (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  if (user.username === "admin") {
    return res.status(400).json({ error: "Super Admin cannot be suspended." });
  }

  (user as any).active = (user as any).active === false ? true : false;
  saveJSON("users.json", users);
  const statusStr = (user as any).active ? "ACTIVATED" : "SUSPENDED";
  logEvent("USER_STATUS_CHANGE", "ADMIN", `User account [${user.username}] was ${statusStr}.`, req.ip);

  res.json({ success: true, username: user.username, active: (user as any).active });
});

// File Return Request for Order (Customer Portal)
app.post("/api/orders/:id/return", (req, res) => {
  const orderId = parseInt(req.params.id);
  const { reason } = req.body;
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }

  const existingRequest = returnRequests.find(r => r.orderId === orderId);
  if (existingRequest) {
    return res.status(400).json({ error: "Return request already exists for this order." });
  }

  const reqId = returnRequests.length + 1;
  const newRequest = {
    id: reqId,
    orderId,
    reason: reason || "Quality issue",
    status: "PENDING" as const,
    refundAmount: order.totalAmount,
    requestedAt: new Date().toISOString()
  };

  returnRequests.push(newRequest);
  saveJSON("returnRequests.json", returnRequests);
  order.status = "RETURNED"; // Set to returned directly or allow admin approval
  saveJSON("orders.json", orders);
  logEvent("RETURN_REQUESTED", order.customerName, `Filed return request ID: ${reqId} for Order #${orderId}.`, req.ip);

  res.status(201).json(newRequest);
});

// Get Return Requests (Admin Panel)
app.get("/api/admin/returns", (req, res) => {
  res.json(returnRequests);
});

// Approve/Reject Return Request (Admin Panel)
app.post("/api/admin/returns/:id/approve", (req, res) => {
  const reqId = parseInt(req.params.id);
  const { action } = req.body; // 'APPROVE' or 'REJECT'
  const request = returnRequests.find(r => r.id === reqId);
  if (!request) {
    return res.status(404).json({ error: "Return request not found." });
  }

  const order = orders.find(o => o.id === request.orderId);
  if (action === "APPROVE") {
    request.status = "APPROVED";
    if (order) order.status = "DELIVERED"; // Keep standard
    logEvent("RETURN_APPROVED", "ADMIN", `Approved refund for Request #${reqId}.`, req.ip);
  } else {
    request.status = "REJECTED";
    logEvent("RETURN_REJECTED", "ADMIN", `Rejected refund for Request #${reqId}.`, req.ip);
  }
  saveJSON("returnRequests.json", returnRequests);
  saveJSON("orders.json", orders);

  res.json({ success: true, request });
});

// Get Coupons List (Customer & Admin)
app.get("/api/coupons", (req, res) => {
  res.json(coupons);
});

// Create Coupon (Admin Panel)
app.post("/api/coupons", (req, res) => {
  const { code, discountPercent, description } = req.body;
  if (!code || !discountPercent) {
    return res.status(400).json({ error: "Missing required coupon details (code, discountPercent)." });
  }

  const codeUpper = code.toUpperCase().trim();
  const exists = coupons.some(c => c.code === codeUpper);
  if (exists) {
    return res.status(400).json({ error: "Coupon code already exists." });
  }

  const newCoupon = {
    code: codeUpper,
    discountPercent: parseInt(discountPercent),
    description: description || `${discountPercent}% discount promo code`,
    active: true
  };

  coupons.push(newCoupon);
  saveJSON("coupons.json", coupons);
  logEvent("COUPON_CREATED", "ADMIN", `Created coupon code ${codeUpper} (${discountPercent}%).`, req.ip);

  res.status(201).json(newCoupon);
});

// Get Audit Security Logs (Admin Panel)
app.get("/api/admin/logs", (req, res) => {
  res.json(auditLogs);
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
