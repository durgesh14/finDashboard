import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvestmentSchema, InsertInvestment, Investment, InvestmentType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface AddInvestmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingInvestment?: Investment | null;
}

export function AddInvestmentModal({ open, onOpenChange, editingInvestment }: AddInvestmentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!editingInvestment;

  const { data: investmentTypes, isLoading: investmentTypesLoading } = useQuery<InvestmentType[]>({
    queryKey: ["/api/investment-types"],
  });

  const form = useForm<InsertInvestment>({
    resolver: zodResolver(insertInvestmentSchema),
    defaultValues: {
      name: "",
      type: "",
      principalAmount: "0",
      startDate: "",
      paymentFrequency: "monthly",
      dueDay: null,
      maturityDate: null,
      expectedReturn: null,
      notes: null,
    },
  });

  // Update form values when editing
  useEffect(() => {
    if (editingInvestment) {
      form.reset({
        name: editingInvestment.name,
        type: editingInvestment.type,
        principalAmount: editingInvestment.principalAmount,
        startDate: editingInvestment.startDate,
        paymentFrequency: editingInvestment.paymentFrequency as "monthly" | "quarterly" | "half_yearly" | "yearly" | "one_time",
        dueDay: editingInvestment.dueDay,
        maturityDate: editingInvestment.maturityDate,
        expectedReturn: editingInvestment.expectedReturn,
        notes: editingInvestment.notes,
      });
    } else {
      form.reset({
        name: "",
        type: "",
        principalAmount: "0",
        startDate: "",
        paymentFrequency: "monthly",
        dueDay: null,
        maturityDate: null,
        expectedReturn: null,
        notes: null,
      });
    }
  }, [editingInvestment, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertInvestment) => 
      isEditMode 
        ? apiRequest("PUT", `/api/investments/${editingInvestment.id}`, data)
        : apiRequest("POST", "/api/investments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Success",
        description: isEditMode ? "Investment updated successfully" : "Investment added successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: isEditMode ? "Failed to update investment" : "Failed to add investment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertInvestment) => {
    createMutation.mutate(data);
  };

  const paymentFrequency = form.watch("paymentFrequency");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEditMode ? "Edit Investment" : "Add New Investment"}</DialogTitle>
            <button 
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-modal"
            >
              <X size={20} />
            </button>
          </div>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="type">Investment Type</Label>
              <Select 
                onValueChange={(value) => form.setValue("type", value)}
                value={form.watch("type")}
              >
                <SelectTrigger data-testid="select-investment-type">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {investmentTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.type.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="name">Investment Name</Label>
              <Input
                id="name"
                placeholder="e.g., HDFC Top 100 Fund"
                {...form.register("name")}
                data-testid="input-investment-name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="principalAmount">Principal Amount</Label>
              <Input
                id="principalAmount"
                type="number"
                placeholder="10000"
                {...form.register("principalAmount")}
                data-testid="input-principal-amount"
              />
              {form.formState.errors.principalAmount && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.principalAmount.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
                data-testid="input-start-date"
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.startDate.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="paymentFrequency">Payment Frequency</Label>
              <Select 
                onValueChange={(value) => form.setValue("paymentFrequency", value as "monthly" | "quarterly" | "half_yearly" | "yearly" | "one_time")}
                value={form.watch("paymentFrequency")}
              >
                <SelectTrigger data-testid="select-payment-frequency">
                  <SelectValue placeholder="Select Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="half_yearly">Half-yearly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.paymentFrequency && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.paymentFrequency.message}</p>
              )}
            </div>
            
            {paymentFrequency !== "one_time" && (
              <div>
                <Label htmlFor="dueDay">Due Day</Label>
                <Select 
                  onValueChange={(value) => form.setValue("dueDay", parseInt(value))}
                  value={form.watch("dueDay")?.toString()}
                >
                  <SelectTrigger data-testid="select-due-day">
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="maturityDate">Maturity Date (Optional)</Label>
              <Input
                id="maturityDate"
                type="date"
                {...form.register("maturityDate")}
                data-testid="input-maturity-date"
              />
            </div>
            
            <div>
              <Label htmlFor="expectedReturn">Expected Return/Interest Rate (%) (Optional)</Label>
              <Input
                id="expectedReturn"
                type="number"
                step="0.01"
                placeholder="12.5"
                {...form.register("expectedReturn")}
                data-testid="input-expected-return"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Any additional information about this investment..."
              {...form.register("notes")}
              data-testid="textarea-notes"
            />
          </div>
          
          <div className="flex items-center justify-end space-x-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              data-testid="button-submit"
            >
              {createMutation.isPending 
                ? (isEditMode ? "Updating..." : "Adding...") 
                : (isEditMode ? "Update Investment" : "Add Investment")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
