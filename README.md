# ⚖️ AI-Powered Legal Document Assistant Final Year Project Under Dr. Ferdous Ahmed Barbhuiya

A full-stack intelligent legal assistant that empowers users to understand legal documents, retrieve relevant case law, and generate legally-aligned responses — without needing prior legal expertise.

---

## 🌟 Features

- 📑 **Document Comparison**: Highlights semantic similarity between uploaded legal documents and past judgments using FAISS + OpenAI embeddings.
- 🧠 **Layman-Friendly Summarization**: Summarizes complex legal documents using Google’s Gemini API and prompt engineering.
- 📚 **Judgment Retrieval**: Retrieves top-k most similar judgments from a curated Madras High Court dataset.
- 📝 **Draft Response Generation**: Classifies legal documents (reply, affidavit, amendment) and generates editable drafts.
- 🎯 **Modular UI**: React-based frontend for document upload, comparison, summarization, and response generation.
- ⚙️ **Scalable Backend**: Built with Node.js, Express.js, MongoDB, and Docker for containerization.

---

## 🧠 How It Works

### 🔁 1. Document Comparison (Starting Point)
- Upload a legal document (PDF or DOCX).
Implement functionality to compare the uploaded legal
document with retrieved case judgments, highlighting key contextual and semantic similarities.
This will help users understand how their case aligns with previous rulings.
  ![image](https://github.com/user-attachments/assets/2812e49c-cd7e-4d05-8baa-3af2e3466824)


### 🧠 2. Summarization with Gemini API
- Uses prompt-engineered input to simplify legal content for general users.
- Gemini generates concise, structured summaries.

![image](https://github.com/user-attachments/assets/9e671041-29a7-467a-bbcc-341a478f3089)

### 📚 3. Judgment Search (Used FAISS) 
- Judgments from Madras High Court are embedded and indexed In FAISS.
- User input is matched against this index to retrieve Top K relevant Judgements From FAISS.
- 
![image](https://github.com/user-attachments/assets/f2d04a0a-e5d9-4f3b-9429-ee8d20332fb0)
![image](https://github.com/user-attachments/assets/243c63a3-f0ee-4731-8caa-c48c20b76edf)


### 🧾 4. Classification & Draft Generation
After uploading and comparing documents, the system classifies the legal document as:

Reply

Affidavit

Application

or None (no action needed)


![image](https://github.com/user-attachments/assets/21d5501c-8cc7-4e9a-badd-c1ba5bd58d18)
Based on this classification, a corresponding draft is generated.

The user can then review, edit, and export the draft.

✅ Export Options:

📄 Download as PDF

📝 Export as Word (.docx)

🗒️ Save as Text (.txt)
![image](https://github.com/user-attachments/assets/5c44faeb-9d86-4b61-a47a-1b8bf1e3b7ca)


---



## 🛠️ Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **AI/LLM Integration**:
  - Google Gemini API for summarization
  - OpenAI embeddings (`text-embedding-ada-002`)
- **Similarity Search**: FAISS
- **File Parsing**: `pdf-parse`, `mammoth`, `docx`, etc.

---

## 📦 Project Setup

### 🔧 Prerequisites

- Node.js
- MongoDB (local or cloud)
- Docker (optional but recommended)
- API Keys for OpenAI + Gemini

### 📁 Clone & Install

```bash
git clone https://github.com/kumar102003/btp.git
cd ai-legal-assistant
npm install
