# 🚀 Certify Deployment Guide

This guide provides the exact steps to deploy the full-stack Certify application, separating the frontend (Vercel) from the backend (Render).

---

## 1. Deploy the Backend (Render)

Render is perfect for our Express backend since it provides a persistent environment without the strict timeouts of serverless platforms (which can interrupt PDF signing and blockchain transactions).

### Steps
1. Push your latest code to GitHub.
2. Log in to [Render](https://render.com) and click **New +** -> **Web Service**.
3. Connect your GitHub repository (`Certify`).
4. Configure the Web Service:
   - **Name**: `certify-backend` (or similar)
   - **Root Directory**: `backend` (⚠️ Important: DO NOT leave blank)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. **Environment Variables**: Add all the variables found in `backend/.env.example` to the Render dashboard. Make sure to input production values for your database, JWT secret, and blockchain keys.
6. Click **Create Web Service**. 
7. Once deployed, copy your backend URL (e.g., `https://certify-backend.onrender.com`).

---

## 2. Deploy the Frontend (Vercel)

Vercel will build and distribute your React (Vite) application via its global CDN for lightning-fast speeds.

### Steps
1. Log in to [Vercel](https://vercel.com) and click **Add New** -> **Project**.
2. Import the exact same `Certify` GitHub repository.
3. Configure the Project:
   - **Project Name**: `certify-frontend` (or similar)
   - **Framework Preset**: `Vite` (Should be automatically detected)
   - **Root Directory**: Click "Edit" and select `frontend` (⚠️ Important)
4. **Environment Variables**:
   - Add a new variable named `VITE_API_URL`
   - Set its value to your Render backend URL (e.g., `https://certify-backend.onrender.com`) **without** the trailing slash.
5. Click **Deploy**.

> [!NOTE]  
> The Vercel deployment will automatically use the `vercel.json` file added to the `frontend` folder to properly route SPA paths back to `index.html`.

---

## 3. Post-Deployment Checks

1. Verify that the Vercel frontend loads without errors.
2. Open the browser's developer console (F12) and go to the Network tab to ensure API calls are directed to your `https://certify-backend.onrender.com/api` endpoints and not `localhost:3000`.
3. Test a login or registration flow to ensure database and blockchain connectivity on the backend is fully functional.
