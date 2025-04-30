# 1. Clone
git clone https://github.com/your-org/optiload.git
cd optiload

# 2. Install dependencies
npm install     
cd client && npm install   
cd ..

# 3. Environment variables
cp .env.example .env        

# 4. (Optional) seed some demo data
npm run seed

# 5. Run in development
npm run dev        # nodemon + live-reload static front-end
# → http://localhost:3000
