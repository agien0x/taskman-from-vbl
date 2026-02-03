interface RichContentProps {
  content: string;
  className?: string;
}

export const RichContent = ({ content, className = "" }: RichContentProps) => {
  // Simplified version - just render as text, no mentions
  const cleanText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  return (
    <div className={className}>
      <span className="whitespace-pre-wrap">{cleanText(content)}</span>
    </div>
  );
};
