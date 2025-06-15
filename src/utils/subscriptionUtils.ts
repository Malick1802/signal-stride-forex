
export const getTimeRemaining = (endDate: string | null) => {
  if (!endDate) return null;
  
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return { expired: true, text: 'Expired', urgency: 'high' };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  let urgency = 'low';
  if (days <= 1) urgency = 'high';
  else if (days <= 3) urgency = 'medium';
  
  if (days > 0) {
    return { 
      expired: false, 
      text: `${days} day${days === 1 ? '' : 's'} left`, 
      days, 
      urgency 
    };
  }
  
  return { 
    expired: false, 
    text: `${hours} hour${hours === 1 ? '' : 's'} left`, 
    hours, 
    urgency: 'high' 
  };
};

export const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};
