export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  export const formatPrice = (price) => {
    if (price === undefined || price === null) return '—';
    return `$${Number(price).toFixed(2)}`;
  };
  
  export const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
  };
  
  export const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };