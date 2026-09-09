# Bayyin | بيّن

## Saudi Contract Analysis Platform

Bayyin is a digital platform designed to help users understand and analyze Saudi contracts through automated contract analysis, risk identification, clause explanations, and references to relevant official Saudi regulations and sources when available.

## Features

- Analyze Saudi contracts.
- Break down and explain contract clauses.
- Identify potential risks and important clauses.
- Provide a safety and risk assessment.
- Connect relevant clauses with official Saudi legal references when available.
- Provide a checklist before signing or certifying a contract.
- Save contract analyses and access them later.
- Manage saved analyses through a personal account.
- Support multiple contract categories.
- Arabic and English interface.

## Supported Contract Types

Bayyin currently supports:

- Employment Contracts
- Rental Contracts
- Banking Contracts
- Telecommunications Contracts
- Subscription Contracts
- Used Car Contracts

Some contract categories are currently experimental while their legal knowledge bases and references are still being expanded and verified.

## How It Works

1. Upload a contract.
2. Select the contract type.
3. Bayyin extracts and processes the contract content.
4. The relevant legal knowledge base is searched.
5. Contract clauses are analyzed and classified.
6. Potential risks and important clauses are identified.
7. Relevant official references are displayed when reliable matches are available.
8. The user receives recommendations and a pre-certification checklist.
9. The analysis can be saved for future access.

## Technology Stack

### Frontend
- HTML
- CSS
- JavaScript
- Vite

### Backend
- Node.js
- Express

### Database & Authentication
- Supabase
- PostgreSQL
- JSONB
- Row Level Security (RLS)

### AI & Retrieval
- Retrieval-Augmented Generation (RAG)
- TF-IDF
- Local AI processing

### Document Processing
- PDF
- DOCX
- Image/OCR processing

## Legal Knowledge Base

Bayyin uses a structured legal knowledge base organized by contract type.

The knowledge base contains relevant legal provisions, keywords, references, and official sources used to support the analysis.

The system searches the knowledge base according to the selected contract category to improve the relevance of the retrieved legal information.

## Privacy & Security

Bayyin is designed with user privacy and data protection in mind.

Authentication and database access controls are used to separate users' saved analyses and protect stored account information.

## Legal Disclaimer

Bayyin is an informational and analytical platform designed to help users understand contract content and identify potential legal considerations.

The platform does not provide legally binding advice and does not replace consultation with a licensed lawyer or legal professional.

## Project Status

Bayyin is an ongoing project.

The platform is continuously being improved through:

- Expanding the legal knowledge base.
- Adding and verifying official references.
- Improving contract analysis accuracy.
- Enhancing the user experience.
- Improving security and data protection.
- Supporting additional contract types.

## Getting Started

### Requirements

- Node.js
- npm

### Installation

```bash
npm install
npm install --prefix server
