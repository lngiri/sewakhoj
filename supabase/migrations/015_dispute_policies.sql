-- Enable customers to insert their own disputes
CREATE POLICY "Customers can create disputes" ON public.disputes
  FOR INSERT WITH CHECK (auth.uid() = raised_by);
