export const formatDate = (date: string): string => {
  if (!date) return "—";
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
};

export const money = (n: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

export const nextId = (prefix: string): string => {
  return `${prefix}-${String(Date.now()).slice(-6)}`;
};
