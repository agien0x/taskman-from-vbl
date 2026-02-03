import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { UserProfileSettings } from "@/components/UserProfileSettings";

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-accent">
      <header className="px-4 py-3 bg-card/10 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </div>
      </header>
      
      <div className="container mx-auto py-8">
        <div className="bg-card rounded-lg shadow-lg">
          <UserProfileSettings />
        </div>
      </div>
    </div>
  );
};

export default Profile;
