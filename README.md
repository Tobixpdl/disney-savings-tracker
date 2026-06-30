# Disney & Universal 2028 Savings Tracker

Tracker mágico de ahorros para un viaje a Disney y Universal en 2028.

## Stack

- React
- TypeScript
- CSS puro
- Vite
- localStorage por defecto
- Firebase Firestore opcional

## Estructura

```txt
.
├── index.html
├── package.json
├── tsconfig.json
├── .env.example
├── FIREBASE_SETUP.txt
└── src
    ├── App.tsx
    ├── App.css
    ├── firebase.ts
    ├── main.tsx
    ├── storage.ts
    ├── types.ts
    └── vite-env.d.ts
```

## Correr localmente

```bash
npm install
npm run dev
```

## Cambiar montos iniciales

Editar `defaultCategories` en `src/storage.ts`.

## Activar Firebase

Seguir los pasos de `FIREBASE_SETUP.txt`.
