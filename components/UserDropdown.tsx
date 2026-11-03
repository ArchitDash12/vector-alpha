"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { NAV_ITEMS } from "@/lib/constants";
import { signOut } from "@/lib/actions/auth.actions";

const UserDropdown = ({ user }: { user: User }) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={"ghost"}
          className="flex items-center gap-3 text-gray-400 hover:text-yellow-500 cursor-pointer"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
              {user.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-base font-medium text-gray-400">
              {user.name}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 text-gray-400 bg-gray-800 border border-gray-600 p-2 shadow-xl rounded-lg"
      >
        <DropdownMenuLabel className="p-2">
          <div className="flex relative items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
                {user.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-base font-medium text-gray-400 truncate">
                {user.name}
              </span>
              <span className="text-sm text-gray-500 truncate">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-600 my-1" />
        <DropdownMenuGroup>
          {NAV_ITEMS.map((item) => (
            <DropdownMenuItem
              key={item.href}
              asChild
              className={`text-sm font-medium focus:bg-gray-700 focus:text-yellow-500 cursor-pointer rounded-md transition-colors ${
                isActive(item.href)
                  ? "text-yellow-500 bg-gray-700/40"
                  : "text-gray-100"
              }`}
            >
              <Link href={item.href} className="w-full flex items-center py-2 px-2.5">
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-gray-600 my-1" />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-gray-100 text-sm font-medium focus:bg-gray-700 focus:text-yellow-500 transition-colors cursor-pointer rounded-md py-2 px-2.5 flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
