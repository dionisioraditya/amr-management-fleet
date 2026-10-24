<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vehicle_logs', function (Blueprint $table) {
            $table->id();
            $table->string('vehicle_id');
            $table->foreign('vehicle_id')->references('id')->on('vehicles')->cascadeOnDelete();
            $table->string('event');
            $table->string('level')->default('info'); // 'info', 'warning', 'error', 'critical'
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['vehicle_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicle_logs');
    }
};
