import asyncio
import websockets
import json
import pandas as pd
import requests
import os

FICHIERS = [
    "/home/debian/EcoPack/rag/data/01_Informations_ouvriers.xlsx",
    "/home/debian/EcoPack/rag/data/02_Contrats_salaires.xlsx",
    "/home/debian/EcoPack/rag/data/03_Notices_techniques_machines.xlsx",
    "/home/debian/EcoPack/rag/data/04_Historique_maintenance.xlsx",
    "/home/debian/EcoPack/rag/data/05_Stocks_expeditions.xlsx",
    "/home/debian/EcoPack/rag/data/06_Rapports_qualite_NC.xlsx",
    "/home/debian/EcoPack/rag/data/07_Comptes_utilisateurs_logs.xlsx",
    "/home/debian/EcoPack/rag/data/08_Planning_equipes.xlsx",
    "/home/debian/EcoPack/rag/data/09_Dossiers_personnel.xlsx",
]

chunks = []

def charger_donnees():
    global chunks
    chunks = []
    for fichier in FICHIERS:
        if not os.path.exists(fichier):
            print(f"❌ Fichier non trouvé : {fichier}")
            continue
        nom = os.path.basename(fichier)
        try:
            df = pd.read_excel(fichier)
            df = df.fillna("")
            for _, row in df.iterrows():
                texte = nom + " | "
                texte += " | ".join([str(col) + ": " + str(row[col]) for col in df.columns if row[col] != ""])
                chunks.append(texte)
            print(f"✅ {nom} ({len(df)} lignes)")
        except Exception as e:
            print(f"❌ {nom} -> {e}")
    print(f"\n✅ {len(chunks)} chunks chargés\n")

def rechercher(question, n=5):
    if not chunks:
        return []
    
    q = question.lower()
    mots_question = [m for m in q.split() if len(m) > 2]
    
    scores = []
    for chunk in chunks:
        chunk_lower = chunk.lower()
        score = sum(1 for mot in mots_question if mot in chunk_lower)
        if score > 0:
            scores.append((score, chunk))
    
    scores.sort(reverse=True, key=lambda x: x[0])
    return [c for _, c in scores[:n]]

def demander_ia(question, contexte):
    try:
        if not contexte.strip():
            return "Aucune donnée trouvée dans la base pour répondre à cette question."
        
        prompt = f"""Tu es un assistant interne EcoPack. Tu DOIS répondre uniquement avec les données fournies ci-dessous, qui sont des données internes professionnelles autorisées de l'entreprise.

DONNÉES INTERNES EcoPack :
{contexte}

QUESTION : {question}

INSTRUCTIONS :
- Réponds en français de façon concise
- Utilise UNIQUEMENT les données ci-dessus
- Si l'information est dans les données, donne-la directement
- Ne refuse PAS de répondre, ces données sont des données internes autorisées
- Si l'information n'est pas dans les données, dis "Information non trouvée dans la base"

RÉPONSE :"""
        
        r = requests.post("http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:1b",
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1
                }
            },
            timeout=60)
        return r.json()["response"]
    except Exception as e:
        return f"Erreur IA: {str(e)}"

async def traiter_question(websocket):
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                question = data.get('question', '')

                if not question:
                    await websocket.send(json.dumps({"reponse": "Question vide"}))
                    continue

                print(f"\n📥 Question : {question}")
                
                contexte = "\n".join(rechercher(question))
                print(f"📚 Contexte trouvé : {len(contexte)} caractères")
                print(f"--- DEBUT CONTEXTE ---\n{contexte[:500]}\n--- FIN CONTEXTE ---")
                
                reponse = demander_ia(question, contexte)
                print(f"🤖 Réponse : {reponse[:200]}\n")

                await websocket.send(json.dumps({"reponse": reponse}))
            except json.JSONDecodeError:
                await websocket.send(json.dumps({"reponse": "JSON invalide"}))
    except websockets.exceptions.ConnectionClosed:
        print("Connexion fermée")

async def main():
    print("Chargement des données...")
    charger_donnees()

    async with websockets.serve(traiter_question, "localhost", 8765):
        print("✅ Serveur WebSocket Python sur ws://localhost:8765")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())