import React from "react";

const NewsTable = ({ news }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Headline</th>
          <th>Sentiment</th>
        </tr>
      </thead>
      <tbody>
        {news.map((article) => (
          <tr key={article.id}>
            <td>{article.headline}</td>
            <td>{article.sentiment}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default NewsTable;
