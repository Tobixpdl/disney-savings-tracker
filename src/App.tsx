import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { defaultTripState, loadTripState, saveTripState } from "./storage";
import type { Category, Contribution, Profile, ProfileId, TripState } from "./types";

type CategoryProgress = Category & {
  covered: number;
  percentage: number;
};

type DetailContent = {
  title: string;
  headline: string;
  body: string;
  chips: string[];
};

const HOTEL_DAYS = 15;
const HOTEL_AVG_PER_NIGHT = 90;
const DISNEY_DAYS = 4;
const UNIVERSAL_DAYS = 5;
const UBER_AVG = 25;

const disneyParks = ["EPCOT", "Magic Kingdom", "Hollywood Studios", "Animal Kingdom"];
const universalParks = ["Epic Universe", "Islands of Adventure", "Universal Studios", "Volcano Bay", "repetir parque favorito"];

const flightMilestones = [
  { min: 1, place: "ida y vuelta completas", note: "¡Listo para reservar el vuelo redondo!" },
  { min: 0.75, place: "el Caribe", note: "Ya estás casi volviendo a casa." },
  { min: 0.5, place: "Orlando", note: "Ya tendrías cubierta la ida." },
  { min: 0.4, place: "México", note: "Ya llegarías hasta México." },
  { min: 0.25, place: "Perú", note: "Ya pasarías buena parte de Sudamérica." },
  { min: 0.12, place: "Uruguay", note: "Ya arrancaste el despegue." },
  { min: 0, place: "Ezeiza", note: "Todavía estamos preparando las valijas." },
];

const profileThemes: Record<ProfileId, { aura: string; label: string; icon: string; motto: string }> = {
  mica: {
    aura: "Rosa pastel · dorado suave",
    label: "Mica",
    icon: "🌸",
    motto: "Un sueño dulce, brillante y cada vez más real.",
  },
  tobi: {
    aura: "Celeste pastel · violeta aventura",
    label: "Tobi",
    icon: "🪐",
    motto: "La aventura se arma paso a paso, como una ruta de parque.",
  },
};

const categoryIcons: Record<string, string> = {
  flight: "✈️",
  hotel: "🏨",
  disney: "🎟️",
  universal: "🌎",
  uber: "🚗",
};

const todayIso = () => new Date().toISOString().slice(0, 10);

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function prettyDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function parseMoneyInput(value: string) {
  const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
  return Number(cleaned);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function getProgressMessage(progress: number) {
  if (progress >= 100) return "¡Viaje desbloqueado!";
  if (progress >= 75) return "Estamos casi en el castillo";
  if (progress >= 50) return "Ya se siente la magia";
  if (progress >= 25) return "La aventura toma forma";
  return "El sueño empieza";
}

function getCategoryIcon(category: Category) {
  return categoryIcons[category.id] || "⭐";
}

function getSouvenirIdea(amount: number) {
  if (amount >= 1200) return "un vuelo completo o una parte enorme del paquete";
  if (amount >= 850) return "una entrada importante del viaje";
  if (amount >= 400) return "una noche de hotel o varios traslados";
  if (amount >= 200) return "comidas y souvenirs para un día fuerte";
  if (amount >= 100) return "una cena linda dentro del parque";
  if (amount >= 75) return "una comida completa para dos";
  if (amount >= 50) return "un Uber largo o varios snacks";
  if (amount >= 30) return "un souvenir chico o una merienda";
  if (amount >= 15) return "un snack especial o una bebida temática";
  if (amount >= 5) return "un caramelo, sticker o primer recuerdito";
  return "una mini chispa para empezar el sueño";
}

function getUnlockedCount(covered: number, unitCost: number, totalUnits: number) {
  if (!unitCost || unitCost <= 0) return 0;
  return Math.min(totalUnits, Math.max(0, Math.floor(covered / unitCost)));
}

function getFlightMilestone(category: CategoryProgress) {
  const ratio = category.target > 0 ? category.covered / category.target : 0;
  return flightMilestones.find((milestone) => ratio >= milestone.min) ?? flightMilestones[flightMilestones.length - 1];
}

function getCategoryDetail(category: CategoryProgress): DetailContent | null {
  if (category.id === "flight") {
    const legCost = category.target > 0 ? category.target / 2 : 0;
    const completedLegs = getUnlockedCount(category.covered, legCost, 2);
    const milestone = getFlightMilestone(category);

    return {
      title: "Vuelo ida y vuelta",
      headline: milestone.note,
      body: `Dividimos el vuelo en 2 tramos de ${money(legCost)}: ida y vuelta. Con ${money(category.covered)}, estás simbólicamente en ${milestone.place}.`,
      chips: [`${completedLegs}/2 tramos`, `Destino simbólico: ${milestone.place}`],
    };
  }

  if (category.id === "hotel") {
    const nights = getUnlockedCount(category.covered, HOTEL_AVG_PER_NIGHT, HOTEL_DAYS);
    const nextNight = Math.min(nights + 1, HOTEL_DAYS);

    return {
      title: "Hotel para 15 días",
      headline: nights >= HOTEL_DAYS ? "¡Ya tenés cubiertas las 15 noches!" : `Ya cubriste ${nights} de ${HOTEL_DAYS} noches.`,
      body: nights >= HOTEL_DAYS
        ? `Usando un promedio de ${money(HOTEL_AVG_PER_NIGHT)} por noche, el hotel ya estaría cubierto.`
        : `Calculando aprox. ${money(HOTEL_AVG_PER_NIGHT)} por noche, faltaría seguir juntando para desbloquear la noche ${nextNight}.`,
      chips: [`${nights}/${HOTEL_DAYS} noches`, `${money(HOTEL_AVG_PER_NIGHT)} por noche aprox.`],
    };
  }

  if (category.id === "disney") {
    const dayCost = category.target > 0 ? category.target / DISNEY_DAYS : 0;
    const days = getUnlockedCount(category.covered, dayCost, DISNEY_DAYS);
    const unlockedParks = disneyParks.slice(0, days);
    const nextPark = disneyParks[Math.min(days, disneyParks.length - 1)];

    return {
      title: "Entradas Disney",
      headline: days > 0 ? `Ya podrías entrar a ${unlockedParks[unlockedParks.length - 1]}.` : `El primer parque a desbloquear es ${nextPark}.`,
      body: `Dividimos Disney en ${DISNEY_DAYS} días. Cada día equivale aprox. a ${money(dayCost)} del objetivo actual.`,
      chips: [`${days}/${DISNEY_DAYS} días`, unlockedParks.length ? unlockedParks.join(" · ") : `Próximo: ${nextPark}`],
    };
  }

  if (category.id === "universal") {
    const dayCost = category.target > 0 ? category.target / UNIVERSAL_DAYS : 0;
    const days = getUnlockedCount(category.covered, dayCost, UNIVERSAL_DAYS);
    const unlockedParks = universalParks.slice(0, days);
    const nextPark = universalParks[Math.min(days, universalParks.length - 1)];

    return {
      title: "Entradas Universal",
      headline: days > 0 ? `¡Ya podés entrar a ${unlockedParks[unlockedParks.length - 1]}!` : `El primer objetivo es ${nextPark}.`,
      body: `Dividimos Universal en ${UNIVERSAL_DAYS} días. Cada día equivale aprox. a ${money(dayCost)} del objetivo actual.`,
      chips: [`${days}/${UNIVERSAL_DAYS} días`, unlockedParks.length ? unlockedParks.join(" · ") : `Próximo: ${nextPark}`],
    };
  }

  if (category.id === "uber") {
    const rides = getUnlockedCount(category.covered, UBER_AVG, 999);

    return {
      title: "Traslados en Uber",
      headline: rides === 1 ? "Ya podés tomarte 1 Uber." : `Ya podés tomarte ${rides} Ubers.`,
      body: `Tomamos un promedio de ${money(UBER_AVG)} por viaje. Esto sirve para imaginar traslados entre hotel, parques, outlets o aeropuerto.`,
      chips: [`${rides} viajes aprox.`, `${money(UBER_AVG)} por Uber`],
    };
  }

  return null;
}

function getQuickSummary(categoryProgress: CategoryProgress[]) {
  const byId = new Map(categoryProgress.map((category) => [category.id, category]));
  const flight = byId.get("flight");
  const hotel = byId.get("hotel");
  const disney = byId.get("disney");
  const universal = byId.get("universal");
  const uber = byId.get("uber");

  return [
    flight ? `Vuelo: ${getFlightMilestone(flight).place}` : null,
    hotel ? `Hotel: ${getUnlockedCount(hotel.covered, HOTEL_AVG_PER_NIGHT, HOTEL_DAYS)}/${HOTEL_DAYS} noches` : null,
    disney ? `Disney: ${getUnlockedCount(disney.covered, disney.target / DISNEY_DAYS, DISNEY_DAYS)}/${DISNEY_DAYS} días` : null,
    universal ? `Universal: ${getUnlockedCount(universal.covered, universal.target / UNIVERSAL_DAYS, UNIVERSAL_DAYS)}/${UNIVERSAL_DAYS} días` : null,
    uber ? `Uber: ${getUnlockedCount(uber.covered, UBER_AVG, 999)} viajes` : null,
  ].filter(Boolean) as string[];
}

const CategoryCard = memo(function CategoryCard({
  category,
  isOpen,
  onToggle,
}: {
  category: CategoryProgress;
  isOpen: boolean;
  onToggle: (id: string) => void;
}) {
  const detail = getCategoryDetail(category);

  return (
    <article className={`category-card ${isOpen ? "is-open" : ""} ${detail ? "has-detail" : ""}`}>
      <button
        className="category-button"
        type="button"
        onClick={() => detail && onToggle(category.id)}
        disabled={!detail}
        aria-expanded={detail ? isOpen : undefined}
      >
        <div className="category-header">
          <span className="category-icon">{getCategoryIcon(category)}</span>
          <div>
            <h4>{category.name}</h4>
            <p>{money(category.covered)} de {money(category.target)}</p>
          </div>
        </div>

        <div className="mini-progress" aria-label={`${category.name}: ${Math.round(category.percentage)}%`}>
          <div style={{ width: `${category.percentage}%` }} />
        </div>

        <strong>{Math.round(category.percentage)}%</strong>
        {detail && <small>{isOpen ? "Ocultar detalle" : "Tocar para ver detalle"}</small>}
      </button>

      {detail && isOpen && (
        <div className="category-detail">
          <span>{detail.title}</span>
          <strong>{detail.headline}</strong>
          <p>{detail.body}</p>
          <div className="detail-chips">
            {detail.chips.map((chip) => <em key={chip}>{chip}</em>)}
          </div>
        </div>
      )}
    </article>
  );
});

const HistoryItem = memo(function HistoryItem({
  contribution,
  onRemove,
}: {
  contribution: Contribution;
  onRemove: (id: string) => void;
}) {
  return (
    <li>
      <div className="history-coin" aria-hidden="true">✦</div>
      <div className="history-info">
        <strong>{money(contribution.amount)}</strong>
        <span>{prettyDate(contribution.date)}</span>
        <small>Podría ser {getSouvenirIdea(contribution.amount)}.</small>
      </div>
      <button type="button" onClick={() => onRemove(contribution.id)} aria-label="Eliminar aporte">
        ✕
      </button>
    </li>
  );
});

export default function App() {
  const [trip, setTrip] = useState<TripState>(defaultTripState);
  const [isReady, setIsReady] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryTarget, setNewCategoryTarget] = useState("");
  const [lastSpark, setLastSpark] = useState<{ id: string; amount: number; idea: string } | null>(null);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  useEffect(() => {
    loadTripState().then((savedState) => {
      setTrip(savedState);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;
    saveTripState(trip);
  }, [trip, isReady]);

  useEffect(() => {
    if (!lastSpark) return;

    const timeout = window.setTimeout(() => setLastSpark(null), 2700);
    return () => window.clearTimeout(timeout);
  }, [lastSpark]);

  const activeProfileId = trip.activeProfile;
  const profile = trip.profiles[activeProfileId];

  const totalTarget = useMemo(
    () => profile.categories.reduce((sum, category) => sum + Number(category.target || 0), 0),
    [profile.categories]
  );

  const progress = totalTarget > 0 ? Math.min((profile.savedAmount / totalTarget) * 100, 100) : 0;
  const progressMessage = getProgressMessage(progress);
  const remainingAmount = Math.max(totalTarget - profile.savedAmount, 0);

  const categoryProgress = useMemo(() => {
    let remaining = profile.savedAmount;

    return profile.categories.map((category) => {
      const target = Number(category.target || 0);
      const covered = Math.max(0, Math.min(remaining, target));
      remaining -= covered;

      return {
        ...category,
        covered,
        percentage: target > 0 ? Math.min((covered / target) * 100, 100) : 0,
      };
    });
  }, [profile.categories, profile.savedAmount]);

  const quickSummary = useMemo(() => getQuickSummary(categoryProgress), [categoryProgress]);

  const updateProfile = useCallback((updater: (profile: Profile) => Profile) => {
    setTrip((current) => ({
      ...current,
      profiles: {
        ...current.profiles,
        [current.activeProfile]: updater(current.profiles[current.activeProfile]),
      },
    }));
  }, []);

  const changeProfile = useCallback((profileId: ProfileId) => {
    setTrip((current) => ({ ...current, activeProfile: profileId }));
    setOpenCategoryId(null);
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    setOpenCategoryId((current) => current === categoryId ? null : categoryId);
  }, []);

  const addContribution = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedAmount = parseMoneyInput(amountInput);
    if (!parsedAmount || parsedAmount <= 0) return;

    const contribution: Contribution = {
      id: createId(),
      amount: roundMoney(parsedAmount),
      date: todayIso(),
    };

    updateProfile((currentProfile) => ({
      ...currentProfile,
      savedAmount: roundMoney(currentProfile.savedAmount + contribution.amount),
      contributions: [contribution, ...currentProfile.contributions],
    }));

    setAmountInput("");
    setLastSpark({
      id: contribution.id,
      amount: contribution.amount,
      idea: getSouvenirIdea(contribution.amount),
    });
  }, [amountInput, updateProfile]);

  const removeContribution = useCallback((contributionId: string) => {
    updateProfile((currentProfile) => {
      const contribution = currentProfile.contributions.find((item) => item.id === contributionId);
      const nextContributions = currentProfile.contributions.filter((item) => item.id !== contributionId);

      return {
        ...currentProfile,
        savedAmount: Math.max(0, roundMoney(currentProfile.savedAmount - (contribution?.amount || 0))),
        contributions: nextContributions,
      };
    });
  }, [updateProfile]);

  const updateCategory = useCallback((categoryId: string, field: "name" | "target", value: string) => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      categories: currentProfile.categories.map((category) => {
        if (category.id !== categoryId) return category;

        return {
          ...category,
          [field]: field === "target" ? Math.max(0, Number(value || 0)) : value,
        };
      }),
    }));
  }, [updateProfile]);

  const deleteCategory = useCallback((categoryId: string) => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      categories: currentProfile.categories.filter((category) => category.id !== categoryId),
    }));
    setOpenCategoryId((current) => current === categoryId ? null : current);
  }, [updateProfile]);

  const addCategory = useCallback(() => {
    const target = parseMoneyInput(newCategoryTarget);
    if (!newCategoryName.trim() || !target || target <= 0) return;

    const category: Category = {
      id: `${newCategoryName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: newCategoryName.trim(),
      target: roundMoney(target),
    };

    updateProfile((currentProfile) => ({
      ...currentProfile,
      categories: [...currentProfile.categories, category],
    }));

    setNewCategoryName("");
    setNewCategoryTarget("");
  }, [newCategoryName, newCategoryTarget, updateProfile]);

  const safeProgress = Math.round(progress);
  const travellerPosition = `clamp(14px, ${progress}%, calc(100% - 14px))`;

  return (
    <main className={`app ${activeProfileId}-theme`}>
      <div className="pastel-sky" aria-hidden="true">
        <span className="cloud cloud-one" />
        <span className="cloud cloud-two" />
        <span className="cloud cloud-three" />
      </div>

      <section className="shell">
        <header className="topbar">
          <div className="brand-copy">
            <p className="eyebrow">Ahorros de viaje · 2028</p>
            <h1>Disney & Universal 2028</h1>
            <p className="subtitle">Cada dólar nos acerca a la magia.</p>
          </div>

          <div className="topbar-actions">
            <div className="profile-switch" aria-label="Cambiar perfil activo">
              {(Object.keys(profileThemes) as ProfileId[]).map((profileId) => (
                <button
                  key={profileId}
                  className={profileId === activeProfileId ? "active" : ""}
                  onClick={() => changeProfile(profileId)}
                  type="button"
                >
                  <span>{profileThemes[profileId].icon}</span>
                  {profileThemes[profileId].label}
                </button>
              ))}
            </div>

            <button
              className="settings-button"
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Abrir configuración"
            >
              ⚙️
            </button>
          </div>
        </header>

        <section className="hero-card">
          <div className="hero-content">
            <div className="profile-pill">
              <span>{profileThemes[activeProfileId].icon}</span>
              {profile.name} · {profileThemes[activeProfileId].aura}
            </div>

            <h2>{progressMessage}</h2>
            <p className="hero-copy">{profileThemes[activeProfileId].motto}</p>

            <div className="money-board">
              <article>
                <span>Ahorrado</span>
                <strong>{money(profile.savedAmount)}</strong>
              </article>
              <article>
                <span>Objetivo</span>
                <strong>{money(totalTarget)}</strong>
              </article>
              <article>
                <span>Falta</span>
                <strong>{money(remainingAmount)}</strong>
              </article>
            </div>

            <div className="dream-summary" aria-label="Resumen mágico por categoría">
              <span>Resumen mágico</span>
              <div>
                {quickSummary.map((item) => <em key={item}>{item}</em>)}
              </div>
            </div>
          </div>

          <div className="dream-scene" aria-hidden="true">
            <div className="sun" />
            <div className="castle-silhouette">
              <span className="tower tower-left" />
              <span className="tower tower-center" />
              <span className="tower tower-right" />
              <span className="castle-body" />
              <span className="castle-door" />
            </div>
            <div className="scene-hill" />
          </div>

          <div className="progress-story" aria-label={`Progreso del ${safeProgress}%`}>
            <div className="progress-copy">
              <span>{safeProgress}% del sueño</span>
              <strong>{safeProgress >= 100 ? "Listo para reservar" : "Camino al castillo"}</strong>
            </div>

            <div className="ribbon-track">
              <div className="ribbon-fill" style={{ width: `${progress}%` }} />
              <span className="path-pin" style={{ left: travellerPosition }}>🎈</span>
            </div>

            <div className="road-labels">
              <span>Primer dólar</span>
              <span>Viaje completo</span>
            </div>
          </div>

          {lastSpark && (
            <aside className="wish-toast" key={lastSpark.id}>
              <span>✨</span>
              <div>
                <strong>Sumaste {money(lastSpark.amount)}</strong>
                <p>Eso ya podría ser {lastSpark.idea}.</p>
              </div>
            </aside>
          )}
        </section>

        <section className="quick-actions">
          <article className="panel add-panel">
            <div className="section-heading">
              <span>💌</span>
              <div>
                <h3>Sumar magia</h3>
                <p>Cargá un nuevo ahorro en dólares.</p>
              </div>
            </div>

            <form onSubmit={addContribution} className="add-form">
              <label htmlFor="amount">Monto en USD</label>
              <div className="input-row">
                <input
                  id="amount"
                  inputMode="decimal"
                  placeholder="Ej: 50"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                />
                <button type="submit">Sumar</button>
              </div>
            </form>
          </article>

          <article className="panel history-panel">
            <div className="section-heading compact-heading">
              <span>🎁</span>
              <div>
                <h3>Últimos aportes</h3>
                <p>Cada carga muestra qué podría comprar simbólicamente.</p>
              </div>
            </div>

            {profile.contributions.length === 0 ? (
              <p className="empty-state">Todavía no hay aportes. El primer caramelo mágico está esperando.</p>
            ) : (
              <ul className="history-list">
                {profile.contributions.slice(0, 6).map((contribution) => (
                  <HistoryItem
                    key={contribution.id}
                    contribution={contribution}
                    onRemove={removeContribution}
                  />
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="categories-section">
          <div className="section-heading wide-heading">
            <span>🗺️</span>
            <div>
              <h3>Etapas del viaje</h3>
              <p>
                Tocá Vuelo, Hotel, Entradas Disney, Entradas Universal o Uber para ver qué parte del viaje ya está desbloqueada.
              </p>
            </div>
          </div>

          <div className="category-grid">
            {categoryProgress.map((category) => (
              <CategoryCard
                category={category}
                isOpen={openCategoryId === category.id}
                key={category.id}
                onToggle={toggleCategory}
              />
            ))}
          </div>
        </section>
      </section>

      {settingsOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Configuración de categorías">
          <aside className="settings-modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Configuración</p>
                <h2>Objetivos de {profile.name}</h2>
                <p>Objetivo actual: <strong>{money(totalTarget)}</strong></p>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Cerrar configuración">
                ✕
              </button>
            </div>

            <div className="settings-list">
              {profile.categories.map((category) => (
                <div className="settings-row" key={category.id}>
                  <input
                    value={category.name}
                    onChange={(event) => updateCategory(category.id, "name", event.target.value)}
                    aria-label="Nombre de categoría"
                  />
                  <input
                    type="number"
                    min="0"
                    value={category.target}
                    onChange={(event) => updateCategory(category.id, "target", event.target.value)}
                    aria-label="Monto objetivo"
                  />
                  <button type="button" onClick={() => deleteCategory(category.id)}>
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            <div className="add-category-box">
              <h3>Agregar nueva categoría</h3>
              <div className="settings-row add-row">
                <input
                  placeholder="Ej: Comida"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Objetivo USD"
                  value={newCategoryTarget}
                  onChange={(event) => setNewCategoryTarget(event.target.value)}
                />
                <button type="button" onClick={addCategory}>Agregar</button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
