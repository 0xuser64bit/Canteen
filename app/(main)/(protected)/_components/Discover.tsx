import { Separator } from "@/components/ui/separator";
import { Eye } from "lucide-react";

export const Discover = () => {
  return (
    <div>
      <div className="border px-5">
        <span className="font-semibold text-sm text-slate-500">
          Popular post
        </span>
        <ul>
          <div className="py-2">
            <li className="flex gap-x-2 items-center justify-between pb-1">
              <p className="font-semibold text-sm">
                Join Meta IC6 or stay PMT at Amazon
              </p>
              <Eye className="w-4 h-4 text-slate-400" />
            </li>
            <Separator />
          </div>
        </ul>
      </div>
    </div>
  );
};
