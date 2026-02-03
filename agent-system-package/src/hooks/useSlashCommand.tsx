import { useState, useEffect, useCallback } from "react";

interface SlashItem {
  id: string;
  type: "task" | "agent";
  title: string;
  content: string;
}

export const useSlashCommand = (value: string, onSelect: (item: SlashItem) => void) => {
  const [items, setItems] = useState<SlashItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredItems, setFilteredItems] = useState<SlashItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load items would be implemented by the consuming application
  // This is a placeholder implementation
  useEffect(() => {
    setItems([]);
  }, []);

  // Calculate relevance score
  const calculateRelevance = useCallback((item: SlashItem, context: string, query: string): number => {
    let score = 0;
    const lowerTitle = item.title.toLowerCase();
    const lowerContent = item.content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const lowerContext = context.toLowerCase();

    // Exact match in title
    if (lowerTitle === lowerQuery) score += 100;
    
    // Title starts with query
    if (lowerTitle.startsWith(lowerQuery)) score += 50;
    
    // Title includes query
    if (lowerTitle.includes(lowerQuery)) score += 25;
    
    // Content includes query
    if (lowerContent.includes(lowerQuery)) score += 10;
    
    // Context relevance
    const contextWords = lowerContext.split(/\s+/).filter(w => w.length > 2);
    contextWords.forEach(word => {
      if (lowerTitle.includes(word)) score += 5;
      if (lowerContent.includes(word)) score += 2;
    });

    return score;
  }, []);

  // Detect slash and filter items
  useEffect(() => {
    const cursorPos = value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      const textAfterSlash = textBeforeCursor.slice(lastSlashIndex + 1);
      
      // Get 20 words before slash for context
      const textBeforeSlash = textBeforeCursor.slice(0, lastSlashIndex);
      const words = textBeforeSlash.split(/\s+/);
      const context = words.slice(-20).join(' ');

      if (textAfterSlash.length === 0 || /^[a-zA-Zа-яА-Я0-9\s]*$/.test(textAfterSlash)) {
        setShowSuggestions(true);
        
        // Filter and sort by relevance
        const filtered = items
          .map(item => ({
            item,
            score: calculateRelevance(item, context, textAfterSlash),
          }))
          .filter(({ score }) => score > 0 || textAfterSlash.length === 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(({ item }) => item);

        setFilteredItems(filtered);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [value, items, calculateRelevance]);

  const handleSelect = useCallback((item: SlashItem) => {
    onSelect(item);
    setShowSuggestions(false);
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter" && showSuggestions) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }, [showSuggestions, filteredItems, selectedIndex, handleSelect]);

  return {
    showSuggestions,
    filteredItems,
    selectedIndex,
    handleSelect,
    handleKeyDown,
    closeSuggestions: () => setShowSuggestions(false),
  };
};