export type Database = {
  public: {
    Tables: {
      academia: {
        Row: any;
        Insert: any;
        Update: any;
      };
      cargo: {
        Row: any;
        Insert: any;
        Update: any;
      };
      movimiento: {
        Row: any;
        Insert: any;
        Update: any;
      };
      persona: {
        Row: any;
        Insert: any;
        Update: any;
      };
      envio_sugerido: {
        Row: any;
        Insert: any;
        Update: any;
      };
    };
    Views: {
      [key: string]: {
        Row: any;
      };
    };
    Functions: {
      [key: string]: {
        Args: any;
        Returns: any;
      };
    };
    Enums: {
      [key: string]: any;
    };
  };
};
