-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',

    "companyName" TEXT,
    "legalBusinessName" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "cin" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsappNumber" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "pincode" TEXT,

    "currency" TEXT DEFAULT 'INR',
    "currencySymbol" TEXT DEFAULT '₹',
    "timezone" TEXT DEFAULT 'Asia/Kolkata',
    "dateFormat" TEXT DEFAULT 'dd/MM/yyyy',
    "invoicePrefix" TEXT DEFAULT 'INV',
    "quotationPrefix" TEXT DEFAULT 'QUO',
    "projectPrefix" TEXT DEFAULT 'PRJ',
    "clientPrefix" TEXT DEFAULT 'CLI',
    "leadPrefix" TEXT DEFAULT 'LD',
    "defaultGstPercent" DECIMAL(5,2) DEFAULT 18,
    "defaultPaymentTerms" TEXT,
    "companySignatureUrl" TEXT,
    "companyStampUrl" TEXT,

    "bankName" TEXT,
    "accountHolder" TEXT,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "branch" TEXT,
    "upiId" TEXT,
    "qrCodeUrl" TEXT,

    "senderName" TEXT,
    "replyToEmail" TEXT,
    "supportEmail" TEXT,

    "facebook" TEXT,
    "instagram" TEXT,
    "linkedin" TEXT,
    "twitter" TEXT,
    "youtube" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);
