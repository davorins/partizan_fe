// utils/gradeUtils.ts
export const calculateGradeFromDOB = (
  dob: string | Date,
  currentYear: number
): string => {
  if (!dob) return '';

  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  const birthYear = birthDate.getUTCFullYear();

  // Washington state cutoff (August 31st)
  const cutoffMonth = 7; // August (0-indexed)
  const cutoffDay = 31;

  // Determine academic year (current year if after cutoff, previous year if before)
  const today = new Date();
  const academicYear =
    today.getMonth() > cutoffMonth ||
    (today.getMonth() === cutoffMonth && today.getDate() >= cutoffDay)
      ? currentYear
      : currentYear - 1;

  let baseGrade = academicYear - birthYear - 5; // Adjust for typical K start age

  // Handle edge cases
  if (baseGrade < 0) return 'PK'; // Pre-K
  if (baseGrade === 0) return 'K'; // Kindergarten
  if (baseGrade > 12) return '12'; // Max grade

  return baseGrade.toString();
};

export const getOrdinalSuffix = (grade: string) => {
  if (grade === 'PK' || grade === 'K') return '';

  const num = parseInt(grade);
  if (isNaN(num)) return '';

  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
};
