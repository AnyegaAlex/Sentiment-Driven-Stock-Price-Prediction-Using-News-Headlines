import { useState } from 'react';
import PropTypes from 'prop-types';
import { Newspaper } from 'lucide-react';

const NewsArticleImage = ({ src, title }) => {
  const [hasFailed, setHasFailed] = useState(false);

  if (!src || hasFailed) {
    return (
      <div
        data-testid="news-image-fallback"
        aria-hidden="true"
        className="flex h-48 w-full items-center justify-center rounded-t-lg bg-gray-800"
      >
        <Newspaper className="h-12 w-12 text-gray-600" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title ? `Image for ${title}` : 'News article image'}
      className="h-48 w-full rounded-t-lg object-cover"
      loading="lazy"
      onError={() => setHasFailed(true)}
    />
  );
};

NewsArticleImage.propTypes = {
  src: PropTypes.string,
  title: PropTypes.string,
};

export default NewsArticleImage;
