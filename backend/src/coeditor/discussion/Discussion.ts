export interface Discussion {
  id: string
  text: string
  title: string
  owner_id: string
  template_id: string
  created_at: string
  updated_at: string
  context: string
  parameters: Record<string, string>
}
