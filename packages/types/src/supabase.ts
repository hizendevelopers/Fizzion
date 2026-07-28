export type Brand = {
  id: string;
  name: string;
  slug: string | null;
  color: string | null;
  logo_url: string | null;
};

export type TvChannel = {
  id: string;
  name: string;
  slug: string;
  genre: string | null;
  primary_language: string | null;
  logo_url: string | null;
  country: string | null;
};

export type Campaign = {
  id: string;
  brand_id: string | null;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type TvCampaignChannel = {
  campaign_id: string;
  channel_id: string;
};

export type SpendRecord = {
  brand_id: string;
  campaign_id: string;
  platform_id: string;
  spend_date: string;
  amount: number;
  currency: string;
};

export type TvAdDetection = {
  channel_id: string;
  campaign_id: string | null;
  cost: number | null;
  currency: string | null;
};
