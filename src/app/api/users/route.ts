import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    const requestData = await request.json();
    
    // Verificar se o usuário atual é um administrador
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar o papel do usuário atual
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (currentUserProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem criar novos usuários' },
        { status: 403 }
      );
    }

    // Gerar senha temporária
    const generateTemporaryPassword = () => {
      const length = 12;
      const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      let password = "";
      for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      return password;
    };

    // Criar o usuário
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: requestData.email,
      password: generateTemporaryPassword(),
      email_confirm: true,
      user_metadata: {
        name: requestData.name,
        role: requestData.role,
      }
    });

    if (authError) {
      throw authError;
    }

    // Atualizar o perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name: requestData.name,
        role: requestData.role,
        institution_id: requestData.institutionId,
        active: requestData.active,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID do usuário não fornecido' },
        { status: 400 }
      );
    }

    // Verificar se o usuário atual é um administrador
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar o papel do usuário atual
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (currentUserProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir usuários' },
        { status: 403 }
      );
    }

    // Excluir o usuário do auth.users (o trigger ON DELETE CASCADE cuidará de remover o perfil)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 