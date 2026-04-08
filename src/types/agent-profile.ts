export interface AgentProfile {
  phone: string;
  headshotUrl: string | null;
  licenseNumber: string;
  brokerageName: string;
  yearsExperience: number | null;
  marketFocus: string[];
  bio: string;
  onboardingCompleted: boolean;
}

export const DEFAULT_AGENT_PROFILE: AgentProfile = {
  phone: '',
  headshotUrl: null,
  licenseNumber: '',
  brokerageName: '',
  yearsExperience: null,
  marketFocus: [],
  bio: '',
  onboardingCompleted: false,
};
