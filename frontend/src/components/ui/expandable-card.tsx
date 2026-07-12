"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useExpandable } from "@/components/ui/use-expandable";
import { ChevronDown, Star, AlertCircle, Calendar, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface Contributor {
  name: string;
  avatarUrl?: string;
}

interface Task {
  title: string;
  completed: boolean;
}

export interface ProjectStatusCardProps {
  title: string;
  progress: number;
  dueDate: string;
  contributors: Contributor[];
  tasks: Task[];
  githubStars: number;
  openIssues: number;
}

export function ProjectStatusCard({
  title,
  progress,
  dueDate,
  contributors,
  tasks,
  githubStars,
  openIssues,
}: ProjectStatusCardProps) {
  const { isExpanded, toggleExpand } = useExpandable(false);

  return (
    <Card className="bg-white border border-gray-150 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-[#1B2A4A] font-bold text-lg">{title}</CardTitle>
            <CardDescription className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
              <Calendar size={12} className="text-gray-400" />
              <span>Due: {dueDate}</span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-1 text-[10px] py-0.5 border-amber-200 text-amber-700 bg-amber-50">
              <Star size={10} className="fill-amber-500 stroke-amber-500" />
              <span>{githubStars} stars</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-[10px] py-0.5 border-rose-200 text-rose-700 bg-rose-50">
              <AlertCircle size={10} />
              <span>{openIssues} issues</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress block */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-gray-500">
            <span>Completion Progress</span>
            <span className="text-[#2B70AB]">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-gray-100 [&>div]:bg-[#2B70AB]" />
        </div>

        {/* Contributors block */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-gray-500 font-medium">Contributors</span>
          <div className="flex -space-x-2">
            {contributors.map((c, i) => (
              <Avatar key={i} className="border-2 border-white w-7 h-7">
                <AvatarFallback className="bg-gray-100 text-[#1B2A4A] text-[10px] font-bold">
                  {c.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>

        {/* Tasks Expandable Section */}
        <div className="pt-2">
          <button
            onClick={toggleExpand}
            className="flex items-center justify-between w-full text-xs text-gray-500 font-semibold hover:text-[#1B2A4A] transition py-1.5 border-t border-gray-100 mt-2"
          >
            <span>{isExpanded ? "Hide Tasks" : `Show Tasks (${tasks.length})`}</span>
            <ChevronDown
              size={14}
              className={cn("transition-transform duration-300", isExpanded && "rotate-180")}
            />
          </button>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <ul className="space-y-2 mt-3 pl-1">
                  {tasks.map((t, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs text-gray-600">
                      {t.completed ? (
                        <CheckSquare size={13} className="text-[#2B70AB]" />
                      ) : (
                        <Square size={13} className="text-gray-300" />
                      )}
                      <span className={cn(t.completed && "line-through text-gray-400")}>
                        {t.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
