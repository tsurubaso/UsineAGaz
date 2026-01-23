FROM node:20-slim

# Créer le dossier de l'app
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les librairies
RUN npm install

# Copier le reste du code
COPY . .

# Lancer le script index.js
CMD ["node", "index.js"]