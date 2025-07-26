import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Save } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Profile } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function ProfileForm() {
  const [profile, setProfile] = useLocalStorage<Profile>("jobApplierProfile", {
    name: "",
    email: "",
    phone: "",
  });
  
  const { toast } = useToast();

  const handleInputChange = (field: keyof Profile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = () => {
    if (profile.name && profile.email && profile.phone) {
      toast({
        title: "Profile saved",
        description: "Your profile information has been saved locally.",
      });
    } else {
      toast({
        title: "Incomplete profile",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <User className="text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Profile Setup</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </Label>
            <Input
              type="text"
              id="fullName"
              placeholder="John Doe"
              value={profile.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </Label>
            <Input
              type="email"
              id="email"
              placeholder="john.doe@email.com"
              value={profile.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </Label>
            <Input
              type="tel"
              id="phone"
              placeholder="+1 (555) 123-4567"
              value={profile.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleSaveProfile}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
