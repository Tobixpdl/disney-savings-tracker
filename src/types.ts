export type ProfileId = "mica" | "tobi";

export type Contribution = {
  id: string;
  amount: number;
  date: string;
};

export type Category = {
  id: string;
  name: string;
  target: number;
};

export type Profile = {
  name: string;
  savedAmount: number;
  contributions: Contribution[];
  categories: Category[];
};

export type TripState = {
  activeProfile: ProfileId;
  profiles: Record<ProfileId, Profile>;
};
