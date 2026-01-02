export function getCurrentSeason(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  if (month >= 3 && month <= 5) return 'Spring';
  if (month === 6 && day <= 30) return 'Summer'; // June 1-30 is Summer
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
}

export function getNextSeason(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // January is 0
  const day = now.getDate();

  if (month >= 3 && month <= 5) return 'Summer';
  if (month === 6 && day <= 30) return 'Summer'; // June 1-30 is Summer
  if (month >= 6 && month <= 8) return 'Fall';
  if (month >= 9 && month <= 11) return 'Winter';
  return 'Spring';
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function isPlayerActive(player: {
  season?: string;
  registrationYear?: number;
}): boolean {
  // If either property is missing, consider inactive
  if (!player.season || player.registrationYear === undefined) {
    return false;
  }

  const currentSeason = getCurrentSeason();
  const currentYear = getCurrentYear();
  const nextSeason = getNextSeason();
  const nextSeasonYear =
    currentSeason === 'Winter' ? currentYear + 1 : currentYear;

  return (
    (player.season === currentSeason &&
      player.registrationYear === currentYear) ||
    (player.season === nextSeason &&
      player.registrationYear === nextSeasonYear) ||
    player.registrationYear > currentYear
  );
}
