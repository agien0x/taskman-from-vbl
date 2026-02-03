import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { User } from "lucide-react";

const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC", offset: "+00:00" },
  { value: "Europe/Moscow", label: "Москва", offset: "+03:00" },
  { value: "Europe/London", label: "Лондон", offset: "+00:00" },
  { value: "Europe/Paris", label: "Париж", offset: "+01:00" },
  { value: "America/New_York", label: "Нью-Йорк", offset: "-05:00" },
  { value: "America/Los_Angeles", label: "Лос-Анджелес", offset: "-08:00" },
  { value: "Asia/Tokyo", label: "Токио", offset: "+09:00" },
  { value: "Asia/Shanghai", label: "Шанхай", offset: "+08:00" },
  { value: "Australia/Sydney", label: "Сидней", offset: "+11:00" },
];

const COUNTRIES = [
  { value: "RU", label: "Россия" },
  { value: "US", label: "США" },
  { value: "GB", label: "Великобритания" },
  { value: "FR", label: "Франция" },
  { value: "DE", label: "Германия" },
  { value: "JP", label: "Япония" },
  { value: "CN", label: "Китай" },
  { value: "AU", label: "Австралия" },
];

export const UserProfileSettings = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setFullName(profile.full_name || "");
        setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        setCountry(profile.country || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Ошибка загрузки профиля");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          timezone,
          country: country || null,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Профиль обновлён");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Ошибка обновления профиля");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Загрузка...</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <User className="h-6 w-6" />
        <h2 className="text-2xl font-semibold">Настройки профиля</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Имя</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Введите ваше имя"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Временная зона</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Автоматически определена: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Страна</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger id="country">
              <SelectValue placeholder="Выберите страну" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Сохранение..." : "Сохранить изменения"}
        </Button>
      </div>
    </div>
  );
};
