import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Filter, ArrowUpDown, X, Clock, Flag, Calendar, User, ArrowUp, ArrowDown, List, EyeOff, Eye, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type SortOption = "owner_first" | "priority" | "end_date" | "owner" | "updated_at" | null;
export type SortDirection = "asc" | "desc";

interface BoardFiltersProps {
  sortBy: SortOption;
  sortDirection: SortDirection;
  onSortChange: (sort: SortOption) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  filterByOwner: string | null;
  onOwnerFilterChange: (ownerId: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hideCompleted: boolean;
  onHideCompletedChange: (hide: boolean) => void;
}

export function BoardFilters({
  sortBy,
  sortDirection,
  onSortChange,
  onSortDirectionChange,
  filterByOwner,
  onOwnerFilterChange,
  searchQuery,
  onSearchChange,
  hideCompleted,
  onHideCompletedChange,
}: BoardFiltersProps) {
  const [owners, setOwners] = useState<Array<{ id: string; name: string; avatar_url?: string }>>([]);

  useEffect(() => {
    loadOwners();
  }, []);

  const loadOwners = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url");

      if (error) throw error;

      if (data) {
        setOwners(data.map(p => ({
          id: p.user_id,
          name: p.full_name || "Unknown",
          avatar_url: p.avatar_url || undefined,
        })));
      }
    } catch (error) {
      console.error("Error loading owners:", error);
    }
  };

  const activeOwner = owners.find(o => o.id === filterByOwner);

  const getSortIcon = () => {
    switch (sortBy) {
      case "owner_first": return UserCheck;
      case "updated_at": return Clock;
      case "priority": return Flag;
      case "end_date": return Calendar;
      case "owner": return User;
      default: return ArrowUpDown;
    }
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case "owner_first": return "Сначала мои";
      case "updated_at": return "Обновлению";
      case "priority": return "Приоритету";
      case "end_date": return "Дате";
      case "owner": return "Владельцу";
      default: return "Сортировка";
    }
  };

  const SortIcon = getSortIcon();
  const DirectionIcon = sortDirection === "asc" ? ArrowUp : ArrowDown;

  return (
    <div className="flex items-center gap-1.5">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Поиск..."
          className="pl-8 pr-8 h-8 text-sm"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange("")}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Visibility Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={hideCompleted ? "secondary" : "ghost"} 
            size="sm" 
            className="h-8 text-xs"
          >
            {hideCompleted ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
          <DropdownMenuLabel>Отображение</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={hideCompleted}
            onCheckedChange={onHideCompletedChange}
          >
            Скрыть Done и Архив
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Owner Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={filterByOwner ? "secondary" : "ghost"} 
            size="sm" 
            className="h-8 text-xs"
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            {activeOwner ? (
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={activeOwner.avatar_url} />
                  <AvatarFallback className="text-[8px]">
                    {activeOwner.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[80px] truncate">{activeOwner.name}</span>
              </div>
            ) : (
              "Владелец"
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
          <DropdownMenuLabel>Фильтр по владельцу</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onOwnerFilterChange(null)}>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs">Все</span>
              </div>
              <span>Все владельцы</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {owners.map((owner) => (
            <DropdownMenuItem 
              key={owner.id} 
              onClick={() => onOwnerFilterChange(owner.id)}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={owner.avatar_url} />
                  <AvatarFallback className="text-[10px]">
                    {owner.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{owner.name}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={sortBy ? "secondary" : "ghost"} 
            size="sm" 
            className="h-8 text-xs gap-1"
          >
            <SortIcon className="h-3.5 w-3.5" />
            {sortBy && <DirectionIcon className="h-3 w-3" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover z-50">
          <DropdownMenuLabel>Сортировка</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onSortChange("owner_first")}>
            <UserCheck className="h-4 w-4 mr-2" />
            Сначала мои
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange(null)}>
            <List className="h-4 w-4 mr-2" />
            Без сортировки
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange("updated_at")}>
            <Clock className="h-4 w-4 mr-2" />
            По обновлению
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange("priority")}>
            <Flag className="h-4 w-4 mr-2" />
            По приоритету
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange("end_date")}>
            <Calendar className="h-4 w-4 mr-2" />
            По дате окончания
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange("owner")}>
            <User className="h-4 w-4 mr-2" />
            По владельцу
          </DropdownMenuItem>
          {sortBy && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Направление</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onSortDirectionChange("asc")}>
                <ArrowUp className="h-4 w-4 mr-2" />
                По возрастанию
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortDirectionChange("desc")}>
                <ArrowDown className="h-4 w-4 mr-2" />
                По убыванию
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
