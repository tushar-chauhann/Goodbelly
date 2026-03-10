import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, //SMTP server
  port: 465, // 465 for SSL, 587 for TLS
  secure: true, // Set to true for SSL
  auth: {
    user: process.env.EMAIL_USER, // Your full email address (e.g., ops@goodbelly.in)
    pass: process.env.EMAIL_PASS, // Your email password or app password
  },
});

// 🧩 Reusable email layout
const generateEmailTemplate = ({ title, message, content, footerNote }) => `
  <head>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&display=swap");
      
      body {
        font-family: "Fraunces", serif;
        font-optical-sizing: auto;
        font-weight: 300;
        margin: 0;
        padding: 0;
        background-color: #f7f7f7;
      }

      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }

      .header {
        background-color: #6a8b7a; /* Updated to the primary greenish color */
        padding: 20px;
        border-radius: 8px 8px 0 0;
        text-align: center;
      }

      .header h1 {
        color: #ffffff;
        margin: 0;
        font-size: 24px;
        letter-spacing: 1px;
      }

      .content {
        padding: 30px;
      }

      .content h2 {
        color: #333333;
        margin-top: 0;
        font-size: 20px;
      }

      .content p {
        color: #666666;
        font-size: 16px;
        line-height: 1.5;
      }

      .otp-section {
        background-color: #f5f5f5;
        padding: 20px;
        border-radius: 6px;
        text-align: center;
        margin: 20px 0;
      }

      .otp-section h1 {
        color: #1a1a1a;
        font-size: 36px;
        letter-spacing: 8px;
        margin: 0;
      }

      .footer {
        background-color: #f5f5f5;
        padding: 15px;
        text-align: center;
        border-radius: 0 0 8px 8px;
      }

      .footer p {
        color: #999999;
        font-size: 12px;
        margin: 0;
      }

      .footer .note {
        color: #ff0000;
        font-size: 14px;
        font-style: italic;
      }

      a {
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>GoodBelly</h1>
      </div>
      <div class="content">
        <h2>${title}</h2>
        <p>${message}</p>
        ${content}
        <p class="note">${footerNote}</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} GoodBelly. All rights reserved.</p>
        <p>This is an automated message, please do not reply.</p>
      </div>
    </div>
  </body>
`;

// 📩 OTP Email
export const sendOTPEmail = async (email, otp, type = "reset") => {
  try {
    let subject, title, message, footerNote;

    switch (type) {
      case "reset":
        subject = "Password Reset OTP - GoodBelly";
        title = "Password Reset Request";
        message =
          "We received a request to reset your password. Please use the following OTP to proceed:";
        footerNote =
          "If you didn't request this OTP, please ignore this email.";
        break;

      case "email-change":
        subject = "Email Change Verification - GoodBelly";
        title = "Verify Your New Email Address";
        message =
          "You have requested to change your email address. Please use the following OTP to verify your new email:";
        footerNote =
          "If you didn't request this change, please contact support immediately.";
        break;

      case "signup":
      default:
        subject = "Signup Verification OTP - GoodBelly";
        title = "Email Verification for Signup";
        message =
          "Thank you for registering with GoodBelly! Use the OTP below to verify your email address:";
        footerNote =
          "If you didn't try to register, you can safely ignore this email.";
        break;
    }

    const html = generateEmailTemplate({
      title,
      message,
      content: `
        <div class="otp-section">
          <h1>${otp}</h1>
        </div>
        <p>This OTP is valid for 10 minutes.</p>
      `,
      footerNote,
    });

    return await transporter.sendMail({
      from: "no-reply@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
};
// 📩 Subscription Email
export const sendSubscriptionEmail = async (email) => {
  try {
    const subject = "Subscription Confirmed - Welcome to GoodBelly!";
    const html = generateEmailTemplate({
      title: "You're Subscribed!",
      message:
        "Thank you for subscribing to GoodBelly! You'll now receive the latest updates, special offers, and delicious food recommendations directly to your inbox.",
      content: `
        <div class="otp-section">
          <p>Stay tuned for exciting updates and curated food content!</p>
        </div>
      `,
      footerNote:
        "If you didn’t subscribe to GoodBelly, please ignore this email or contact our support.",
    });

    return await transporter.sendMail({
      from: "info@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending subscription email:", error);
    throw error;
  }
};

// 📩 Contact Acknowledgment
export const sendContactAcknowledgementEmail = async ({
  name,
  email,
  message,
}) => {
  try {
    const subject = "We've received your message - GoodBelly";

    const html = generateEmailTemplate({
      title: `Hi ${name},`,
      message:
        "Thank you for reaching out to us. We've received your message and will get back to you as soon as possible.",
      content: `
        <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #6a8b7a; margin: 20px 0;">
          ${message}
        </blockquote>
      `,
      footerNote:
        "For urgent inquiries, please contact us directly via phone or chat.",
    });

    return await transporter.sendMail({
      from: "info@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending contact acknowledgment email:", error);
    throw error;
  }
};

// 📩 Vendor Under Review Email
export const sendVendorUnderReviewEmail = async (email, vendorName) => {
  try {
    const subject = "Vendor Verification In Progress - GoodBelly";
    const html = generateEmailTemplate({
      title: `Hi ${vendorName || "there"},`,
      message:
        "Thank you for verifying your email. Your vendor account is currently under review by our admin team.",
      content: `
        <div class="otp-section">
          <p>We appreciate your patience!</p>
          <p>You'll be notified as soon as your account is approved.</p>
        </div>
      `,
      footerNote:
        "Need help in the meantime? Feel free to reach out to our support team.",
    });

    return await transporter.sendMail({
      from: "vendorsupport@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending vendor under review email:", error);
    throw error;
  }
};

// 📩 Vendor Approved Email
export const sendVendorApprovedEmail = async (email, vendorName) => {
  try {
    const subject = "Your Vendor Account is Approved - GoodBelly";
    const html = generateEmailTemplate({
      title: `Hi ${vendorName},`,
      message:
        "Great news! Your vendor account has been approved. You can now log in to your dashboard and start listing your delicious dishes on GoodBelly.",
      content: `
        <div class="otp-section">
          <p>Welcome to the GoodBelly family!</p>
          <p>Your journey as a vendor begins now.</p>
          <a href="https://admin.goodbelly.in" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #6a8b7a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px;">
            Login to Dashboard
          </a>
        </div>
      `,
      footerNote:
        "Need help setting up? Reach out to our vendor support team any time.",
    });

    return await transporter.sendMail({
      from: "vendorsupport@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending vendor approved email:", error);
    throw error;
  }
};

export const sendConsultantIntakeEmail = async ({
  email,
  name,
  specialization,
  consultantTypes = [],
  city,
  allowInstantCall,
}) => {
  try {
    const subject = "We’ve received your consultant application — GoodBelly";

    const details = `
      <div style="background:#f9fafb; padding:16px 18px; border-radius:8px; margin:20px 0; border:1px solid #e5e7eb;">
        <p style="margin:0 0 10px; color:#111827; font-weight:600;">Summary</p>
        <div style="color:#374151; font-size:14px; line-height:1.6;">
          ${
            specialization
              ? `<div><strong>Specialization:</strong> ${specialization}</div>`
              : ""
          }
          ${
            consultantTypes.length
              ? `<div><strong>Type:</strong> ${consultantTypes.join(
                  ", "
                )}</div>`
              : ""
          }
          ${city ? `<div><strong>City:</strong> ${city}</div>` : ""}
          <div><strong>Instant calling:</strong> ${
            allowInstantCall ? "Enabled" : "Disabled"
          }</div>
        </div>
      </div>
    `;

    const ctas = `
      <div style="text-align:center; margin-top:24px;">
        <a href="https://goodbelly.in/consultations" target="_blank"
          style="display:inline-block; text-decoration:none; background:#6a8b7a; color:#ffffff; padding:12px 20px; border-radius:9999px; font-weight:600; margin-right:10px;">
          Browse dietitians
        </a>
        <a href="https://goodbelly.in" target="_blank"
          style="display:inline-block; text-decoration:none; background:#ffffff; color:#334155; padding:12px 20px; border-radius:9999px; font-weight:600; border:1px solid #e5e7eb;">
          Back to home
        </a>
      </div>
    `;

    const html = generateEmailTemplate({
      title: `Hi ${name || "there"},`,
      message:
        "We’ve received your interest in joining GoodBelly as a consultant. Our partnerships team will reach out within 2–3 business days to verify your certifications, discuss pricing, and enable bookings.",
      content: `${details}${ctas}`,
      footerNote:
        "If you submitted this in error, you can safely ignore this email.",
    });

    return await transporter.sendMail({
      from: "no-reply@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending consultant intake email:", error);
    throw error;
  }
};

// 📩 Internal Ops notification (optional)
export const notifyOpsConsultantIntake = async ({
  name,
  email,
  phone,
  city,
  specialization,
  consultantTypes = [],
  allowInstantCall,
  certCount,
}) => {
  try {
    const subject = "New Consultant Intake — Review Required";
    const html = generateEmailTemplate({
      title: "New consultant intake received",
      message:
        "A new consultant has submitted the onboarding intake. Please verify details and certifications.",
      content: `
        <table style="width:100%; border-collapse:collapse; margin:16px 0;">
          <tbody>
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Name</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">${
              name || "-"
            }</td></tr>
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Email</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">${
              email || "-"
            }</td></tr>
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Phone</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">${
              phone || "-"
            }</td></tr>
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>City</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">${
              city || "-"
            }</td></tr>
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Specialization</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">${
              specialization || "-"
            }</td></tr>
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Type</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">${
              consultantTypes.join(", ") || "-"
            }</td></tr>
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Instant calling</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">${
              allowInstantCall ? "Enabled" : "Disabled"
            }</td></tr>
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Certifications</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">${
              typeof certCount === "number" ? certCount : "-"
            }</td></tr>
          </tbody>
        </table>
      `,
      footerNote: "Tip: reply-all to loop in partnerships.",
    });

    return await transporter.sendMail({
      from: "no-reply@goodbelly.in",
      to: process.env.EMAIL_USER,
      bcc: ["skn.merc@gmail.com", "merc.impex@gmail.com"],
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending ops intake notification:", error);
    throw error;
  }
};

export const sendConsultantVerifiedEmail = async (email, name) => {
  try {
    const subject = "Your Consultant Profile is Live - GoodBelly";

    const html = generateEmailTemplate({
      title: `Hi ${name || "there"},`,
      message: "Your consultant profile is live! Welcome to GoodBelly.",
      content: `
        <div style="background:#f9fafb; padding:16px 18px; border-radius:8px; margin:20px 0; border:1px solid #e5e7eb; font-family:'Fraunces', serif;">
          <div style="color:#374151; font-size:14px; line-height:1.6; margin-bottom: 20px;">
            <div><strong>Name:</strong> ${name || "-"}</div>
          </div>
          <div style="text-align:center;">
            <a href="https://goodbelly.in/consultations?login=true" target="_blank"
              style="
                display:inline-block;
                text-decoration:none;
                background:#6a8b7a;
                color:#ffffff;
                padding:12px 24px;
                border-radius:9999px;
                font-weight:600;
                font-family:'Fraunces', serif;
              ">
              Go to Profile
            </a>
          </div>
        </div>
      `,
      footerNote:
        "If you have any questions, feel free to reach out to our team. We're excited to have you on board!",
    });

    return await transporter.sendMail({
      from: "no-reply@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending consultant verified email:", error);
    throw error;
  }
};

export const sendBookingConfirmationEmail = async (
  email,
  bookingDetails,
  consultantName,
  consultantEmail
) => {
  try {
    const subject = "Booking Confirmed - GoodBelly";
    const html = generateEmailTemplate({
      title: `Hi ${bookingDetails.name},`,
      message:
        "Your booking has been confirmed! Please find the details below.",
      content: `        
        <div style="background:#f9fafb; padding:16px 18px; border-radius:8px; margin:20px 0; border:1px solid #e5e7eb;">
          <p style="margin:0 0 10px; color:#111827; font-weight:600;">Booking Details</p>
          <div style="color:#374151; font-size:14px; line-height:1.6;">
            <div><strong>Date:</strong> ${bookingDetails.date.toDateString()}</div>
            <div><strong>Duration:</strong> ${bookingDetails.duration}</div>
            <div><strong>Time:</strong> ${bookingDetails.time}</div>
            <div><strong>Booking Reference:</strong> ${
              bookingDetails.bookingReference
            }</div>
          </div>
          <p style="margin:20px 0 10px 0; color:#111827; font-weight:600;">Consultant Details</p>
          <div style="color:#374151; font-size:14px; line-height:1.6;">
            <div><strong>Consultant:</strong> ${consultantName}</div>
            <div><strong>Consultant Email:</strong> ${consultantEmail}</div>
          </div>
        </div>
      `,
      footerNote:
        "If you have any questions, feel free to reach out to our team. We're excited to have you on board!",
    });

    return await transporter.sendMail({
      from: "no-reply@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
    throw error;
  }
};

export const sendBookingNotificationEmail = async (
  email,
  bookingDetails,
  userName
) => {
  try {
    const subject = "New Booking Received - GoodBelly";

    const html = generateEmailTemplate({
      title: `Hello ${userName},`,
      message: "You have a new booking! Please find the details below.",
      content: `
        <div style="background:#f9fafb; padding:16px 18px; border-radius:8px; margin:20px 0; border:1px solid #e5e7eb; font-family:'Fraunces', serif;">
          <p style="margin:0 0 10px; color:#111827; font-weight:600;">Booking Details</p>
          <div style="color:#374151; font-size:14px; line-height:1.6;">
            <div><strong>Name:</strong> ${bookingDetails.name}</div>
            <div><strong>Date:</strong> ${bookingDetails.date.toDateString()}</div>
            <div><strong>Duration:</strong> ${bookingDetails.duration}</div>
            <div><strong>Time:</strong> ${bookingDetails.time}</div>
            <div><strong>Booking Reference:</strong> ${
              bookingDetails.bookingReference
            }</div>
          </div>
        </div>
      `,
      footerNote:
        "Please check your dashboard for more details about this booking.",
    });

    return await transporter.sendMail({
      from: "no-reply@goodbelly.in",
      to: email,
      bcc: ["skn.merc@gmail.com", "merc.impex@gmail.com"], // ✅ BCC added
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending booking notification email:", error);
    throw error;
  }
};

// 📩 Order Confirmation to the user
export const sendOrderConfirmationEmail = async (email, orderDetails) => {
  try {
    const subject = `Order Confirmation - GoodBelly (#${
      orderDetails?.referenceId || orderDetails?.id
    })`;

    // Build order items HTML
    const orderItemsHTML = orderDetails.items
      .map((item) => {
        const addOnsText =
          item.Addition &&
          item.Addition.addOns &&
          item.Addition.addOns.length > 0
            ? ` <span style="color:#7c3aed; font-size:12px;">(+ ${item.Addition.addOns
                .map((a) => a.name)
                .join(", ")})</span>`
            : "";
        return `
          <div style="padding:12px 0; border-bottom:1px solid #e5e7eb;">
            <div style="display:flex; justify-content:space-between;">
              <div>
                <strong>${item.product.name}</strong> ${addOnsText}
                <div style="font-size:13px; color:#6b7280; margin-top:4px;">
                  ${item.Weight.weight} | Qty: ${item.quantity}
                </div>
              </div>
              <div style="text-align:right; font-weight:600;">
                ₹${(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    const html = generateEmailTemplate({
      title: `Order Confirmation - #${
        orderDetails.referenceId || orderDetails.id
      }`,
      message:
        "Thank you for your order! We're processing it now and will notify you when it's on its way.",
      content: `
        <div style="background:#f9fafb; padding:16px 18px; border-radius:8px; margin:20px 0; border:1px solid #e5e7eb;">
          <p style="margin:0 0 10px; color:#111827; font-weight:600;">Order Summary</p>
          <div style="color:#374151; font-size:14px; line-height:1.6;">
            <div><strong>Order ID:</strong> ${
              orderDetails.referenceId || orderDetails.id
            }</div>
            <div><strong>Order Date:</strong> ${new Date(
              orderDetails.createdAt
            ).toLocaleDateString()}</div>
            <div><strong>Status:</strong> ${orderDetails.status}</div>
            <div><strong>Payment Method:</strong> ${
              orderDetails.paymentMethod
            }</div>
            <div><strong>Payment:</strong> ${orderDetails.paymentStatus}</div>
          </div>
        </div>

        <div style="background:#fff; padding:16px; border-radius:8px; margin:20px 0; border:1px solid #e5e7eb;">
          <p style="margin:0 0 12px; color:#111827; font-weight:600;">Order Items</p>
          ${orderItemsHTML}
        </div>

        <div style="margin-top:20px; font-weight: bold; color: #111827;">
          <p>Subtotal: ₹${orderDetails.totalPrice.toFixed(2)}</p>
          ${
            orderDetails.gstCharges
              ? `<p>GST: ₹${orderDetails.gstCharges.toFixed(2)}</p>`
              : ""
          }
          ${
            orderDetails.deliveryCharges
              ? `<p>Delivery Charges: ₹${orderDetails.deliveryCharges.toFixed(
                  2
                )}</p>`
              : ""
          }
          ${
            orderDetails.platformCharges
              ? `<p>Platform Charges: ₹${orderDetails.platformCharges.toFixed(
                  2
                )}</p>`
              : ""
          }
          ${
            orderDetails.discount
              ? `<p>Discount: ₹${orderDetails.discount.toFixed(2)}</p>`
              : ""
          }
          <p><strong>Grand Total: ₹${orderDetails.grandTotal.toFixed(
            2
          )}</strong></p>
        </div>
      `,
      footerNote:
        "For any inquiries or issues with your order, feel free to contact us.",
    });

    return await transporter.sendMail({
      from: "orders@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    throw error;
  }
};

// 📩 Vendor Order Notification (modern & consistent)
export const sendVendorNewOrderEmail = async (
  vendorEmail,
  vendorName,
  order
) => {
  try {
    const subject = `🧾 New Order Received - GoodBelly (#${
      order.referenceId || order.id
    })`;

    const orderItemsHTML = order.items
      .map((item) => {
        const addOnsText =
          item.Addition &&
          item.Addition.addOns &&
          item.Addition.addOns.length > 0
            ? `<div style="font-size:12px; color:#7c3aed; margin-top:4px;">+ ${item.Addition.addOns
                .map((a) => a.name)
                .join(", ")}</div>`
            : "";
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">
              <strong style="font-size:15px; color:#111827;">${item.product.name}</strong>
              ${addOnsText}
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">${item.quantity}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-weight:600; color:#111827;">₹${item.price}</td>
          </tr>`;
      })
      .join("");

    const customerName = order?.user?.name || "Customer";
    const customerEmail = order?.user?.email || "N/A";
    const customerPhone = order?.address?.phone || order?.user?.phone;

    const html = generateEmailTemplate({
      title: `🍽️ New Order Received`,
      message: `Hi ${
        vendorName || "Vendor"
      }, a new order has been placed on <strong>GoodBelly</strong>! Please start preparing it promptly.`,
      content: `
        <!-- Order ID at Top -->
        <div style="margin-bottom:20px; background:#dcfce7; padding:14px 18px; border-radius:8px; border:2px solid #16a34a;">
          <p style="margin:0; font-size:18px; font-weight:700; color:#15803d;">
            Order #${order.referenceId || order.id}
          </p>
          <p style="margin:5px 0 0; font-size:13px; color:#166534;">
            ${new Date(order.createdAt).toLocaleDateString()} • ${
        order.paymentStatus
      }
          </p>
        </div>

        <!-- Ordered Items First -->
        <p style="margin-top: 10px; margin-bottom: 5px; font-size:16px; font-weight:700; color:#111827;">Ordered Items</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 5px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="text-align: left; padding: 8px;">Item</th>
              <th style="text-align: left; padding: 8px;">Qty</th>
              <th style="text-align: left; padding: 8px;">Price</th>
            </tr>
          </thead>
          <tbody>${orderItemsHTML}</tbody>
        </table>

        <!-- Total -->
        <div style="margin-top:20px; font-weight: bold; color: #111827;">
          <p>Subtotal: ₹${order.totalPrice.toFixed(2)}</p>
          ${
            order.gstCharges
              ? `<p>GST: ₹${order.gstCharges.toFixed(2)}</p>`
              : ""
          }
          ${
            order.deliveryCharges
              ? `<p>Delivery Charges: ₹${order.deliveryCharges.toFixed(2)}</p>`
              : ""
          }
          ${
            order.platformCharges
              ? `<p>Platform Charges: ₹${order.platformCharges.toFixed(2)}</p>`
              : ""
          }
          ${
            order.discount
              ? `<p>Discount: ₹${order.discount.toFixed(2)}</p>`
              : ""
          }
          <p style="font-size:16px;"><strong>Grand Total: ₹${order.grandTotal.toFixed(
            2
          )}</strong></p>
        </div>

        <!-- Customer Info Below -->
        <div style="background:#f9fafb; padding:16px 18px; border-radius:8px; margin:20px 0; border:1px solid #e5e7eb;">
          <p style="margin:0 0 10px; color:#111827; font-weight:600; font-size:15px;">Customer Details</p>
          <div style="color:#374151; font-size:14px; line-height:1.6;">
            <div><strong>Name:</strong> ${customerName}</div>
            <div><strong>Phone:</strong> ${customerPhone}</div>
            <div><strong>Email:</strong> ${customerEmail}</div>
          </div>
        </div>
      `,
      footerNote:
        "Please ensure timely preparation and delivery. Thank you for being part of the GoodBelly community!",
    });

    return await transporter.sendMail({
      from: "orders@goodbelly.in",
      to: vendorEmail,
      bcc: ["skn.merc@gmail.com", "merc.impex@gmail.com"],
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending vendor new order email:", error);
    throw error;
  }
};

// 📩 Subscription Created Email
export const sendSubscriptionCreatedEmail = async (
  email,
  userName,
  subscriptionId
) => {
  try {
    const subject = "Subscription Activated Successfully - GoodBelly";
    const html = generateEmailTemplate({
      title: `Welcome ${userName || "there"}!`,
      message: `Your subscription (ID: ${subscriptionId}) has been successfully created and is now active!`,
      content: `
        <div class="otp-section">
          <p>Enjoy daily meals and a healthier lifestyle with GoodBelly.</p>
          <a href="https://goodbelly.in/account?tab=subscriptions" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #6a8b7a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px;">
            Manage Your Subscription
          </a>
          <p>We’ll notify you before your subscription ends.</p>
        </div>
      `,
      footerNote: "Thank you for choosing GoodBelly!",
    });

    return await transporter.sendMail({
      from: "subscriptions@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending subscription created email:", error);
    throw error;
  }
};

// 📩 Subscription Cancelled Email
export const sendSubscriptionCancelledEmail = async (
  email,
  userName,
  subscriptionId
) => {
  try {
    const subject = "Subscription Cancelled - GoodBelly";
    const html = generateEmailTemplate({
      title: `Hi ${userName || "there"},`,
      message: `Your subscription (ID: ${subscriptionId}) has been successfully cancelled.`,
      content: `
        <div class="otp-section">
          <p>We’re sorry to see you go. You can reactivate anytime from your GoodBelly account.</p>
          <a href="https://goodbelly.in/account?tab=subscriptions" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #6a8b7a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px;">
            Manage Your Subscription
          </a>
        </div>
      `,
      footerNote: "Need help? Contact our support team anytime.",
    });

    return await transporter.sendMail({
      from: "subscriptions@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending subscription cancelled email:", error);
    throw error;
  }
};

// 📩 Subscription Expired Email
export const sendSubscriptionExpiredEmail = async (
  email,
  userName,
  subscriptionId
) => {
  try {
    const subject = "Subscription Expired - GoodBelly";
    const html = generateEmailTemplate({
      title: `Hi ${userName || "there"},`,
      message: `Your subscription (ID: ${subscriptionId}) has expired. We hope you enjoyed your meals with us!`,
      content: `
        <div class="otp-section">
          <p>Renew now and continue receiving delicious meals hassle-free.</p>
          <a href="https://goodbelly.in/account?tab=subscriptions" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #6a8b7a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px;">
            Create a New Subscription
          </a>
        </div>
      `,
      footerNote: "We’ll be delighted to have you back anytime!",
    });

    return await transporter.sendMail({
      from: "subscriptions@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending subscription expired email:", error);
    throw error;
  }
};

// 📩 Subscription Expiry Reminder Email (2 days before expiry)
export const sendSubscriptionReminderEmail = async (
  email,
  userName,
  subscriptionId,
  endDate
) => {
  try {
    const subject = "Your GoodBelly Subscription is Expiring Soon!";
    const formattedDate = new Date(endDate).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const html = generateEmailTemplate({
      title: `Hi ${userName || "there"},`,
      message: `We noticed your subscription (ID: ${subscriptionId}) is about to expire on <strong>${formattedDate}</strong>.`,
      content: `
        <div class="otp-section">
          <p>Don’t miss out on your daily delicious meals! Renew now and keep your GoodBelly experience uninterrupted.</p>
          <a href="https://goodbelly.in/account?tab=subscriptions" target="_blank"
            style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #6a8b7a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px;">
            Renew Your Subscription
          </a>
        </div>
      `,
      footerNote:
        "We’ll automatically mark your plan as expired if not renewed by the end date.",
    });

    return await transporter.sendMail({
      from: "subscriptions@goodbelly.in",
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending subscription reminder email:", error);
    throw error;
  }
};

// 📩 send Vendor New Subscription Email
export const sendVendorNewSubscriptionEmail = async (
  vendorEmail,
  vendorName,
  subscription
) => {
  try {
    const subject = `🆕 New Subscription Received - GoodBelly`;

    const mealTypes = Array.isArray(subscription.mealTypes)
      ? subscription.mealTypes.join(", ")
      : subscription.mealTypes;

    const html = generateEmailTemplate({
      title: `Hi ${vendorName || "Vendor"},`,
      message: `Good news! You’ve received a new subscription from <strong>${subscription.user.name}</strong>.`,
      content: `
        <div class="otp-section">
          <p><strong>Subscription ID:</strong> ${subscription.id}</p>
          <p><strong>Meal Type(s):</strong> ${mealTypes}</p>
          <p><strong>Duration:</strong> ${new Date(
            subscription.startDate
          ).toLocaleDateString("en-IN")} → ${new Date(
        subscription.endDate
      ).toLocaleDateString("en-IN")}</p>
          <p><strong>Frequency:</strong> ${subscription.frequency}</p>
          <p><strong>Final Price:</strong> ₹${subscription.finalPrice}</p>
          <p><strong>Status:</strong> ${subscription.status}</p>
        </div>
      `,
      footerNote:
        "Please ensure timely delivery according to the subscription schedule.",
    });

    return await transporter.sendMail({
      from: "subscriptions@goodbelly.in",
      to: vendorEmail,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending vendor new subscription email:", error);
    throw error;
  }
};

// 📩 Send Discount Offer Email to User
export const sendUserDiscountOfferEmail = async (email, promoDetails) => {
  try {
    const subject = `Exclusive Discount Just for You! 🎉 | GoodBelly`;

    const html = generateEmailTemplate({
      title: `Exclusive Discount Just for You! 🎉`,
      message: `We’ve got a special offer waiting for you! Use the promo code below to enjoy delicious meals at an even better price.`,
      content: `
        <div style="background:#f9fafb; padding:16px 18px; border-radius:8px; margin:20px 0; border:1px solid #e5e7eb;">
          <p style="margin:0 0 10px; color:#111827; font-weight:600;">Your Offer Details</p>
          <div style="color:#374151; font-size:14px; line-height:1.6;">
            <div><strong>Promo Code:</strong> <span style="color:#16a34a; font-weight:700;">${
              promoDetails.code
            }</span></div>
            <div><strong>Discount:</strong> ${
              promoDetails.discountType === "PERCENTAGE"
                ? `${promoDetails.discount}% Off`
                : `₹${promoDetails.discount} Off`
            }</div>
            <div><strong>Minimum Order Value:</strong> ₹${promoDetails.minOrder.toFixed(
              2
            )}</div>
            <div><strong>Valid Until:</strong> ${new Date(
              promoDetails.expiry
            ).toLocaleDateString()}</div>
          </div>
        </div>

        <div style="margin-top:20px; color:#111827;">
          <p>Don’t wait — order your favorite meals now and save big!</p>
          <p style="font-size:14px; color:#374151;">
            Apply the code during checkout to enjoy your exclusive discount.
          </p>
        </div>

        <div style="margin-top:24px;">
          <a href="https://goodbelly.in/foods" target="_blank" 
            style="display:inline-block; background-color:#16a34a; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">
            Order Now 🍔
          </a>
        </div>
      `,
      footerNote: `This offer is valid only for you until ${new Date(
        promoDetails.expiry
      ).toLocaleDateString()}. Don’t miss out!`,
    });

    await transporter.sendMail({
      from: "offers@goodbelly.in",
      to: email,
      subject,
      html,
    });

    console.log(`✅ Discount offer email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending discount offer email:", error);
  }
};
