export interface MentionSegment {
  type: 'text' | 'task' | 'agent';
  content: string;
  id?: string;
  title?: string;
}

export function parseMentions(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  const mentionRegex = /@(task|agent):([a-f0-9-]+)\[([^\]]+)\]/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }
    
    // Add mention
    segments.push({
      type: match[1] as 'task' | 'agent',
      content: match[0],
      id: match[2],
      title: match[3],
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }
  
  return segments;
}
