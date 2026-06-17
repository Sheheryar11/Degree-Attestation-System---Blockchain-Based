# Blockchain-Based Degree Attestation System

A full-stack, blockchain-powered degree attestation platform built for the Higher Education Commission (HEC) of Pakistan. Students submit degree attestation requests online; payment is verified by an admin; and the attested certificate is anchored on the **Polygon Amoy** blockchain, making it permanently tamper-proof and instantly verifiable by employers via QR code.

---

## Features

- **Online Application** — Students fill a multi-step form (personal details, degree details, attestation type, document upload)
- **OCR Auto-fill** — Upload a photo of your degree certificate; Tesseract.js extracts university name, degree, year, and CGPA automatically
- **Payment Workflow** — Admin issues a payment voucher; student submits payment proof; admin approves
- **Blockchain Registration** — On approval, the degree hash is registered on Polygon Amoy Testnet via a Solidity smart contract
- **PDF Certificate** — A signed attestation certificate PDF is auto-generated and uploaded to Cloudinary
- **Public Verification** — Anyone can verify a degree at `/verify` using a Degree ID, CNIC, or QR code — no login needed
- **Role-Based Access** — Four roles: Student, Officer, Registrar, Admin

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | NestJS, PostgreSQL, Prisma ORM |
| **Auth** | JWT (access + refresh tokens), bcrypt, AES-256-GCM (CNIC encryption) |
| **Storage** | Cloudinary (documents + certificate PDFs) |
| **PDF** | PDFKit (server-side certificate generation) |
| **Blockchain** | Solidity, Hardhat, ethers.js v6, Polygon Amoy Testnet |
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS v4 |
| **UI** | shadcn/ui, Radix UI, Lucide React |
| **State** | Zustand (auth), TanStack Query (server state) |
| **Forms** | React Hook Form + Zod |
| **OCR** | Tesseract.js (client-side) |
| **Hosting** | Netlify (frontend) + Railway (backend) |

---

## Project Structure

```
├── backend/          # NestJS API (port 3001)
│   ├── prisma/       # Schema, migrations, seed
│   └── src/
│       └── modules/  # auth, applications, payments, certificates, blockchain, ...
├── frontend/         # Next.js 15 app (port 3000)
│   ├── app/          # Route groups: (auth), (student), (admin), (officer), (registrar)
│   ├── components/   # Shared UI + application form steps
│   └── lib/          # API clients, Zustand store, validators
└── blockchain/       # Hardhat project
    ├── contracts/    # DegreeAttestation.sol
    └── test/         # 21 passing tests
```

---

## Getting Started (Local)

### Prerequisites
- Node.js 20+
- PostgreSQL 14+

### 1. Clone the repo
```bash
git clone https://github.com/Sheheryar11/Degree-Attestation-System---Blockchain-Based.git
cd Degree-Attestation-System---Blockchain-Based
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env      # fill in your values
npm install
npx prisma migrate deploy
npx prisma db seed         # creates default admin/student accounts
npm run start:dev
```

### 3. Frontend setup
```bash
cd frontend
# create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
npm install
npm run dev
```

Open **http://localhost:3000**

---

## Default Accounts (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@das.gov.pk | Admin@123 |
| Student | student@das.gov.pk | Student@123 |
| Officer | officer@das.gov.pk | Officer@123 |
| Registrar | registrar@das.gov.pk | Registrar@123 |

---

## Environment Variables

### Backend (`.env`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/degree_attestation
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
BACKEND_SIGNER_PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
CNIC_ENCRYPTION_KEY=32-byte-hex
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## Smart Contract

The `DegreeAttestation.sol` contract is deployed on **Polygon Amoy Testnet**. Key functions:

- `registerDegree(degreeId, degreeHash, studentAddress)` — called automatically on payment approval
- `verifyDegree(degreeId)` — public read, returns degree metadata
- `revokeDegree(degreeId)` — admin only

Run tests:
```bash
cd blockchain
npm install
npx hardhat test   # 21 tests
```

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Netlify | Auto-deploys from `frontend/` via `netlify.toml` |
| Backend | Railway | Set env vars; Railway auto-detects NestJS |
| Database | Railway PostgreSQL | Attach to backend service |

Set `FRONTEND_URL` on Railway to your Netlify URL, and `NEXT_PUBLIC_API_URL` on Netlify to your Railway URL.

---

## License

MIT
